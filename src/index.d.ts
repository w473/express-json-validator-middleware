import { RequestHandler } from "express-serve-static-core";
import { JSONSchema4, JSONSchema6, JSONSchema7 } from "json-schema";
import Ajv, { ErrorObject, Options as AjvOptions } from "ajv";

declare module "express-json-validator-middleware" {
	type OptionKey = "body" | "params" | "query";

	type List<T> = {
		[K in OptionKey]?: T;
	};

	export type ValidateFunction =
		| Function
		| String
		| JSONSchema4
		| JSONSchema6
		| JSONSchema7;

	export class Validator {
		ajv: Ajv
		constructor(options: AjvOptions);

		validate (rules: List<ValidateFunction>): RequestHandler;
	}

	export class ValidationError extends Error {
		public validationErrors: List<ErrorObject>;
	}
}
