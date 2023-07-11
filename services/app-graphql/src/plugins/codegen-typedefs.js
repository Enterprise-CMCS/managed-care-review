"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = void 0;
const utils_1 = require("@graphql-tools/utils");
const graphql_1 = require("graphql");
// https://github.com/dotansimha/graphql-code-generator/issues/3899
const print = (schema) => {
    const escapedSchema = schema.replace(/\\`/g, '\\\\`').replace(/`/g, '\\`');
    return ('\n' +
        'import { gql } from "@apollo/client/core"' +
        '\n' +
        'export const typeDefs = gql`' +
        escapedSchema +
        '`;');
};
const plugin = (schema) => print((0, graphql_1.stripIgnoredCharacters)((0, utils_1.printSchemaWithDirectives)(schema)));
exports.plugin = plugin;
