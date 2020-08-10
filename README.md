# eslint-plugin-void

This plugin enables the rules `side-effect` and `arrow-body` that can be used together or separately to enforce a style of using the void-operator.

The rules are entirely --fixable so you can enforce them at any time with little effort even in a large codebase.

## Usage

Install package.

```
npm install eslint-plugin-void --save-dev
```

In `.eslintrc`

```
"plugins": [
  "void"
],
"rules": {
  "void/side-effect": {severity},
  "void/arrow-body": {severity}
}
```

Where severity is "error", "warn" or "off". You can omit "off" values.

<details>
<summary>side-effect</summary>
## side-effect

The void operator can be abused to write expressions that are nothing more than `undefined` with extra steps.

```
const isUndefined = value => value === void 0;
```

This rule disallows use of void without a possible side effect.

## --fix

Code can be automatically fixed with `--fix`. The above example would be fixed to

```
const isUndefined = value => value === undefined;
```

If your code editor supports eslint suggestions, this rule will allow you to apply the fix through a suggestion.

## Default

### Examples of correct code for this rule

```
void functionCall();

void (object.field = value);
```

### Examples of incorrect code for this rule

```
void 0;

void (() => functionCall());
```

## allowTraps

The rule can be configured to allow arguments that may potentially trigger traps.

To allow all traps configure `"allowTraps": true`.

```
rules: {
  "void/side-effect": [{severity}, { "allowTraps": true }]
}
```

To allow select traps configure `"allowTraps": {object}`.

```
rules: {
  "void/side-effect": [
    {severity},
    {
      "allowTraps": {
        "get": {boolean},
        "has": {boolean},
        "ownKeys": {boolean}
      }
    }
  ]
}
```

You can omit false values from the configuration object.

### Examples of correct code for this option

```
void object.field; // get

void 'field' in object; // has

void { ...object }; // ownKeys
```
</details>

<details>
<summary>arrow-body</summary>
## arrow-body

The void operator can be used to stop arrow functions leaking return values.

```
const mutationCallback = value => void (object.field = value);
```

The same effect can be achieved with a function body.

```
const mutationCallback = value => { object.field = value; };
```

This rule enforces one or the other style.

## --fix

Code can be automatically fixed with `--fix`. The above examples would be fixed to

```
const mutationCallback = value => {object.field = value;};
```

and

```
const mutationCallback = value => void (object.field = value);
```

respectively.

If your code editor supports eslint suggestions, this rule will allow you to apply the fixes through a suggestion.

## Default

By default this rule prefers void in all cases.

### Examples of correct code for this rule

```
(value => void sideEffect(value));

(value => void (object.field = value));

(value => void (sideEffect(value), object.field = value));

(value => {
  const input = value.trim();
  sideEffect(value);
});

(value => sideEffect(value));
```

### Examples of incorrect code for this rule

```
(value => { sideEffect(value); });

(value => { object.field = value; });

(value => {
  sideEffect(value);
  object.field = value;
});
```

## multi

The `multi` option allows you to define your preference for multiple side effects in an arrow function body.

### Example of correct code for { "multi": "void" }

```
(value => void (sideEffect(value), object.field = value));
```

### Example of incorrect code for { "multi": "void" }

```
(value => {
  sideEffect(value);
  object.field = value;
});
```

### Example of correct code for { "multi": "body" }

```
(value => {
  sideEffect(value);
  object.field = value;
});
```

### Example of incorrect code for { "multi": "body" }

```
(value => void (sideEffect(value), object.field = value));
```

### { multi: false }

Setting the `multi` option to false will disable this rule for multiple side effect expressions in an arrow function body.

## single

The `single` option allows you to define your preference for a single side effect in an arrow function body.

### Example of correct code for { "single": "void" }

```
(value => void sideEffect(value));
```

### Example of incorrect code for { "single": "void" }

```
(value => {
  sideEffect(value);
});
```

### Example of correct code for { "single": "body" }

```
(value => {
  sideEffect(value);
});
```

### Example of incorrect code for { "single": "body" }

```
(value => void sideEffect(value));
```

### { single: false }

Setting the `multi` option to false will disable this rule for a single side effect in an arrow function body.

## Prefer body

To configure this rule to always prefer function body over the void operator configure both `single` and `multi`.

```
rules: {
  "void/arrow-body": [{severity}, { "single": "body", "multi": "body" }]
}
```
</details>

## When not to use this plugin

If you never want to use the void operator, use [no-void](https://eslint.org/docs/rules/no-void) instead.
Even though this plugin offers fixes that `no-void` does not, the rules conflict so use of both is discouraged.
