const createSideEffect = (context) => {
  let allowTraps = !!context.options[0] && context.options[0].allowTraps;
   if (!allowTraps) {
    allowTraps = {};
  } else if (allowTraps === true) {
    allowTraps = {
      get: true,
      has: true,
      ownKeys: true
    };
  }
  const hasSideEffect = node => {
    switch (node.type) {
      case 'UpdateExpression':
      case 'AssignmentExpression':
      case 'CallExpression':
      case 'OptionalCallExpression':
      case 'NewExpression':
      case 'YieldExpression':
      case 'AwaitExpression':
        return true;
      case 'MemberExpression':
        if (allowTraps.get) return true;
        return hasSideEffect(node.object);
      case 'UnaryExpression':
        if (node.operator === 'delete') return true;
      case 'SpreadElement':
        return hasSideEffect(node.argument);
      case 'BinaryExpression':
        if (allowTraps.has && node.operator === 'in') return true;
      case 'LogicalExpression':
        return hasSideEffect(node.left) || hasSideEffect(node.right);
      case 'SequenceExpression':
        return node.expressions.some(hasSideEffect);
      case 'ArrayExpression':
        return node.elements.some(hasSideEffect);
      case 'ConditionalExpression':
        return hasSideEffect(node.consequent) || hasSideEffect(node.alternative);
      case 'ObjectExpression':
        return node.properties.some(property => 
          property.type === 'Property'
            ? (
              hasSideEffect(property.value)
              || hasSideEffect(property.key)
            )
            : (
              // TODO: define exact type name(s) of spread operator
              allowTraps.ownKeys ||
              (!!property.argument && hasSideEffect(property.argument))
            )
        );
      case 'TemplateLiteral':
        return node.expressions.some(hasSideEffect);
      case 'TaggedTemplateExpression':
        return hasSideEffect(node.quasi);
      default:
        return false;
    }
  };
  return {
    UnaryExpression(node) {
      if (node.operator !== 'void' || hasSideEffect(node.argument)) return;
      const fix = fixer => fixer.replaceText(node, 'undefined');
      context.report({
        node,
        message: 'Unexpected void operator on non-side-effect argument. Use undefined instead.',
        fix,
        suggest: [{
          desc: "Replace with undefined.",
          fix
        }]
      });
    }
  };
};

const createArrowBody = (context) => {
  const SIMPLE_SIDE_EFFECT_EXPRESSIONS = [
    'CallExpression',
    'AssignmentExpression',
    ''
  ];
  let single = (context.options[0] || {}).single;
  if (single == null) single = 'void';
  let multi = (context.options[0] || {}).multi;
  if (multi == null) multi = 'void';
  const lintVoid = (node, scope) => {
    const { body: block } = node;
    if (
      block.type !== 'BlockStatement' ||
      block.body.length === 0 ||
      (scope === 'single' && block.body.length > 1) ||
      (scope === 'multi' && block.body.length === 1) ||
      !block.body.every(
        expressionStatement =>
          expressionStatement.type === 'ExpressionStatement' &&
          SIMPLE_SIDE_EFFECT_EXPRESSIONS.includes(expressionStatement.expression.type)
      )
    ) return;
    const fix = fixer => {
      const source = context.getSourceCode();
      let expressionsReplacement = block.body.map(
        ({ expression }) => source.getText(expression)
      ).join(', ');
      if (block.body.length > 1 || block.body[0].expression.type === 'AssignmentExpression') {
        expressionsReplacement = `(${expressionsReplacement})`;
      }
      const replacement = `void ${expressionsReplacement}`;
      return fixer.replaceText(block, replacement);
    };
    context.report({
      node: block,
      message: 'Unexpected function body. Use void instead.',
      fix,
      suggest: [{
        desc: "Replace with void expression.",
        fix
      }]
    });
  };
  const lintBody = (node, scope) => {
    const { body: voidExpression } = node;
    if (
      voidExpression.type !== 'UnaryExpression' ||
      voidExpression.operator !== 'void' ||
      (scope === 'single' && voidExpression.argument.type === 'SequenceExpression') ||
      (scope === 'multi' && voidExpression.argument.type !== 'SequenceExpression')
    ) return;
    const expressions = voidExpression.argument.type === 'SequenceExpression'
      ? voidExpression.argument.expressions
      : [voidExpression.argument];
    if (
      !expressions.every(
        expression => SIMPLE_SIDE_EFFECT_EXPRESSIONS.includes(expression.type)
      )
    ) return;
    const fix = fixer => {
      const source = context.getSourceCode();
      const expressionsReplacement = expressions.map(
        (expression) => source.getText(expression)
      ).join(';');
      const replacement = `{${expressionsReplacement};}`;
      return fixer.replaceText(voidExpression, replacement);
    };
    context.report({
      node: voidExpression,
      message: 'Unexpected void operator. Use function body instead.',
      fix,
      suggest: [{
        desc: 'Replace with function body.',
        fix
      }]
    });
  }
  return {
    ArrowFunctionExpression: (node) => {
      if (single === 'void') lintVoid(node, 'single')
      else if (single === 'body') lintBody(node, 'single');
      if (multi === 'void') lintVoid(node, 'multi')
      else if (multi === 'body') lintBody(node, 'multi');
    }
  };
};

module.exports = {
  rules: {
    'side-effect': {
      create: createSideEffect,
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow void on non-side-effect arguments',
          suggestion: true
        },
        fixable: 'code',
        schema: [{
          type: 'object',
          properties: {
            allowTraps: {
              type: ['boolean', 'object'],
              properties: {
                get: { type: 'boolean' },
                has: { type: 'boolean' },
                ownKeys: { type: 'boolean' }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }]
      }
    },
    'arrow-body': {
      create: createArrowBody,
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer void operator or function body to void implicit arrow function return values.',
          suggestion: true
        },
        fixable: 'code',
        schema: [{
          type: 'object',
          properties: {
            single: {
              enum: ['void', 'body', false]
            },
            multi: {
              enum: ['void', 'body', false]
            }
          },
          additionalProperties: false
        }]
      }
    }
  },
  configs: {
    recommended: {
      plugins: [
        'void'
      ],
      rules: {
        'void/side-effect': 2,
        'void/arrow-body': 2
      }
    }
  }
};
