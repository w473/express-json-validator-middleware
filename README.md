# express-json-validator-middleware
[express.js](https://github.com/visionmedia/express) middleware for validating requests against JSON Schema


[![npm](https://img.shields.io/npm/dm/express-json-validator-middleware.svg)](https://www.npmjs.com/package/express-json-validator-middleware)
[![npm](https://img.shields.io/npm/v/express-json-validator-middleware.svg)](https://www.npmjs.com/package/express-json-validator-middleware)
[![npm](https://img.shields.io/npm/l/express-json-validator-middleware.svg)](https://www.npmjs.com/package/express-json-validator-middleware)
[![codecov](https://codecov.io/gh/vacekj/express-json-validator-middleware/branch/master/graph/badge.svg)](https://codecov.io/gh/vacekj/express-json-validator-middleware)
[![Build Status](https://travis-ci.org/vacekj/express-json-validator-middleware.svg?branch=master)](https://travis-ci.org/vacekj/express-json-validator-middleware)

<hr>

Coming from `express-jsonschema`? Read our [migration notes](#migrating)

Major version `1.x` of this module uses `ajv@5`, read their changelog and migration guide [here](https://github.com/epoberezkin/ajv/releases/tag/5.0.0).

Major version `2.x` uses `ajv@6` in order to support draft-07 of JSON Schema.
Please keep in mind that you have to manually configure ajv to support **draft-06** schema files from now on (see https://github.com/epoberezkin/ajv#using-version-6).

## Why use this library over [express-jsonschema](https://github.com/trainiac/express-jsonschema) ?

- **Performance** - [ajv](https://github.com/epoberezkin/ajv) offers a [significant performance boost over](https://github.com/ebdrup/json-schema-benchmark/blob/master/README.md#performance) JSONSchema.
- **Latest JSON Schema Standard** - [ajv](https://github.com/epoberezkin/ajv) supports JSON Schema v7 proposal.
- **Active Maintenance** - `express-json-validator-middleware` is being actively maintained.

## Why validate with JSON schemas?

- **Simple** - JSON schemas are a simple and expressive way to describe a data structure.
- **Standard** - JSON schemas are not specific to Javascript. In fact, they are used just about everywhere.
- **Fail-Fast** - Catch errors early in your logic, evading confusing errors later.
- **Separate Validation** - Keep your routes clean. Validation logic doesn't need to be defined in your route handlers.
- **Error Messaging** - Ajv provides you with rich error objects that can easily be transformed into human-readable format.
- **Documentation** - Creating a JSON Schema is another way of documenting your application.

## Installation

```sh
npm install express-json-validator-middleware
```
or
```sh
yarn add express-json-validator-middleware
```

`--save` is no longer necessary as of `npm@5`

## Getting started

1. Require the module
```js
const { Validator, ValidationError } = require('express-json-validator-middleware');
```

2. Initialize a Validator instance, optionally passing in an [ajv#options](https://github.com/epoberezkin/ajv#options) object

```js
const validator = new Validator({allErrors: true});
```

3. *Optional* - Define a bound shortcut function that can be used instead of Validator.validate
```js
const validate = validator.validate;
```

4. Use the Validator.validate method as an Express middleware, passing in an options object of the following format:
```js
Validator.validate({
    requestProperty: schemaToUse
});
```
5. It is possible to use a predefined schema and validate on element:
```js
const schemas = {
    element: {
        type: 'object',
        properties: {
            prop: {
                type: "string"
            }
        }
    }
}
const validator = new Validator({ schemas: schemas });
validator.validate({ body: "element" });

```
6. *Optional* - from version 3.0.0 (ajv 7) additional formats are separated. To use:
```js
const addFormats = require("ajv-formats");
const validator = new Validator();
addFormats(validator.ajv);
```

Example: Validate `req.body` against `bodySchema`

```js
app.post('/street/', validate({body: bodySchema}), function(req, res) {
    // route code
});
```

## Error handling

On encountering erroneous data, the validator will call next() with a ValidationError object.
It is recommended to setup a general error handler for your app where you will catch ValidationError errors

Example - error thrown for the `body` request property

```js
ValidationError {
    name: 'JsonSchemaValidationError',
    validationErrors: {
        body: [AjvError]
    }
}
```

More information on [ajv#errors](https://github.com/epoberezkin/ajv#validation-errors)

## Example Express app

```js
const express = require('express');

const { Validator, ValidationError } = require('express-json-validator-middleware');

// Initialize a Validator instance first
const validator = new Validator({allErrors: true}); // pass in options to the Ajv instance

// Define a shortcut function
const validate = validator.validate;

// Define a JSON Schema
const StreetSchema = {
    type: 'object',
    required: ['number', 'name', 'type'],
    properties: {
        number: {
            type: 'number'
        },
        name: {
            type: 'string'
        },
        type: {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard']
        }
    }
};

const app = express();

app.use(express.json());

// This route validates req.body against the StreetSchema
app.post('/street/', validate({body: StreetSchema}), function(req, res) {
    // At this point req.body has been validated and you can
    // execute your route code
    res.send('valid');
});

// Error handler for validation errors
app.use(function(err, req, res, next) {
    if (err instanceof ValidationError) {
        // At this point you can execute your error handling code
        res.status(400).send('invalid');
        next();
    } else {
    	next(err); // pass error on if not a validation error
    }
});
```

## Validating multiple request properties

Sometimes your route may depend on the `body` and `query` both having a specific format.  In this example we use `body` and `query` but you can choose to validate any `request` properties you like. 

```js
const TokenSchema = {
    type: 'object', // req.query is of type object
    required: ['token'], // req.query.token is required
    properties: {
        uuid: { // validate token
            type: 'string', 
            format: 'uuid',
            minLength: 36,
            maxLength: 36
        }
    }
};

app.post('/street/', Validator.validate({body: StreetSchema, query: TokenSchema}), function(req, res) {
    // application code
});

```

A valid request must now include a token URL query. Example valid URL: `/street/?uuid=af3996d0-0e8b-4165-ae97-fdc0823be417`

## Using dynamic schema

Instead of passing in a schema object you can also pass in a function that will return a schema. It is 
useful if you need to generate or alter the schema based on the request object.

Example: loading schema from the database

// Middleware executed before validate function
```js
function loadSchema(req, res, next) {
    getSchemaFromDB()
        .then((schema) => {
            req.schema = schema;
            next();
        })
        .catch(next);
}

// function that returns a schema object
function getSchema(req) {
	// return the schema from the previous middleware or the default schema
    return req.schema || DefaultSchema;
}

app.post('/street/', loadSchema, Validator.validate({body: getSchema}), function(req, res) {
    // route code
});
```

## Ajv instance
The Ajv instance can be accessed via `validator.ajv`.

```js
var { Validator, ValidationError } = require('express-json-validator-middleware');
var validator = new Validator({allErrors: true});

validator.ajv // ajv instance
```

Ajv must be configured *before* you call `Validator.validate()` to add middleware. (e.g. if you need to define [custom keywords](https://ajv.js.org/custom.html)

## Tests
Tests are written using Mocha & Chai

```
npm install
npm test
```

## More documentation on JSON schemas

- [spacetelescope's understanding json schema](http://spacetelescope.github.io/understanding-json-schema/)

## <a name="migrating"></a> Migrating from `express-jsonschema`

In `express-jsonschema`, you could define a required property in two ways. Ajv only supports one way of doing this.

```js
// CORRECT
{
    type: 'object',
    properties: {
        foo: {
            type: 'string'
        }
    },
    required: ['foo'] // <-- correct way
}

// WRONG
{
    type: 'object',
    properties: {
        foo: {
            type: 'string',
            required: true // nono way
        }
    }
}
```

## Credits

- Maintained by [@simonplend](https://github.com/simonplend/)
- Created and previously maintained by [@vacekj](https://github.com/vacekj/)
- Thank you to all of this project's [contributors](https://github.com/vacekj/express-json-validator-middleware/graphs/contributors)
- Based on the [express-json-schema](https://github.com/trainiac/express-jsonschema) library by [@trainiac](https://github.com/trainiac)
