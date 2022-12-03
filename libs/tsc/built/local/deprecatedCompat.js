"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// The following are deprecations for the public API. Deprecated exports are removed from the compiler itself
// and compatible implementations are added here, along with an appropriate deprecation warning using
// the `@deprecated` JSDoc tag as well as the `Debug.deprecate` API.
//
// Deprecations fall into one of three categories:
//
// - "soft" - Soft deprecations are indicated with the `@deprecated` JSDoc Tag.
// - "warn" - Warning deprecations are indicated with the `@deprecated` JSDoc Tag and a diagnostic message (assuming a compatible host).
// - "error" - Error deprecations are either indicated with the `@deprecated` JSDoc tag and will throw a `TypeError` when invoked, or removed from the API entirely.
//
// Once we have determined enough time has passed after a deprecation has been marked as `"warn"` or `"error"`, it will be removed from the public API.
/* @internal */
var ts;
(function (ts) {
    function createOverload(name, overloads, binder, deprecations) {
        Object.defineProperty(call, "name", __assign(__assign({}, Object.getOwnPropertyDescriptor(call, "name")), { value: name }));
        if (deprecations) {
            for (var _i = 0, _a = Object.keys(deprecations); _i < _a.length; _i++) {
                var key = _a[_i];
                var index = +key;
                if (!isNaN(index) && ts.hasProperty(overloads, "".concat(index))) {
                    overloads[index] = ts.Debug.deprecate(overloads[index], __assign(__assign({}, deprecations[index]), { name: name }));
                }
            }
        }
        var bind = createBinder(overloads, binder);
        return call;
        function call() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var index = bind(args);
            var fn = index !== undefined ? overloads[index] : undefined;
            if (typeof fn === "function") {
                return fn.apply(void 0, args);
            }
            throw new TypeError("Invalid arguments");
        }
    }
    ts.createOverload = createOverload;
    function createBinder(overloads, binder) {
        return function (args) {
            for (var i = 0; ts.hasProperty(overloads, "".concat(i)) && ts.hasProperty(binder, "".concat(i)); i++) {
                var fn = binder[i];
                if (fn(args)) {
                    return i;
                }
            }
        };
    }
    // NOTE: We only use this "builder" because we don't infer correctly when calling `createOverload` directly in < TS 4.7,
    //       but lib is currently at TS 4.4. We can switch to directly calling `createOverload` when we update LKG in main.
    function buildOverload(name) {
        return {
            overload: function (overloads) { return ({
                bind: function (binder) { return ({
                    finish: function () { return createOverload(name, overloads, binder); },
                    deprecate: function (deprecations) { return ({
                        finish: function () { return createOverload(name, overloads, binder, deprecations); }
                    }); }
                }); }
            }); }
        };
    }
    ts.buildOverload = buildOverload;
})(ts || (ts = {}));
// DEPRECATION: Node factory top-level exports
// DEPRECATION PLAN:
//     - soft: 4.0
//     - warn: 4.1
//     - error: 5.0
var ts;
(function (ts) {
    // NOTE: These exports are deprecated in favor of using a `NodeFactory` instance and exist here purely for backwards compatibility reasons.
    var factoryDeprecation = { since: "4.0", warnAfter: "4.1", message: "Use the appropriate method on 'ts.factory' or the 'factory' supplied by your transformation context instead." };
    /** @deprecated Use `factory.createNodeArray` or the factory supplied by your transformation context instead. */
    ts.createNodeArray = ts.Debug.deprecate(ts.factory.createNodeArray, factoryDeprecation);
    /** @deprecated Use `factory.createNumericLiteral` or the factory supplied by your transformation context instead. */
    ts.createNumericLiteral = ts.Debug.deprecate(ts.factory.createNumericLiteral, factoryDeprecation);
    /** @deprecated Use `factory.createBigIntLiteral` or the factory supplied by your transformation context instead. */
    ts.createBigIntLiteral = ts.Debug.deprecate(ts.factory.createBigIntLiteral, factoryDeprecation);
    /** @deprecated Use `factory.createStringLiteral` or the factory supplied by your transformation context instead. */
    ts.createStringLiteral = ts.Debug.deprecate(ts.factory.createStringLiteral, factoryDeprecation);
    /** @deprecated Use `factory.createStringLiteralFromNode` or the factory supplied by your transformation context instead. */
    ts.createStringLiteralFromNode = ts.Debug.deprecate(ts.factory.createStringLiteralFromNode, factoryDeprecation);
    /** @deprecated Use `factory.createRegularExpressionLiteral` or the factory supplied by your transformation context instead. */
    ts.createRegularExpressionLiteral = ts.Debug.deprecate(ts.factory.createRegularExpressionLiteral, factoryDeprecation);
    /** @deprecated Use `factory.createLoopVariable` or the factory supplied by your transformation context instead. */
    ts.createLoopVariable = ts.Debug.deprecate(ts.factory.createLoopVariable, factoryDeprecation);
    /** @deprecated Use `factory.createUniqueName` or the factory supplied by your transformation context instead. */
    ts.createUniqueName = ts.Debug.deprecate(ts.factory.createUniqueName, factoryDeprecation);
    /** @deprecated Use `factory.createPrivateIdentifier` or the factory supplied by your transformation context instead. */
    ts.createPrivateIdentifier = ts.Debug.deprecate(ts.factory.createPrivateIdentifier, factoryDeprecation);
    /** @deprecated Use `factory.createSuper` or the factory supplied by your transformation context instead. */
    ts.createSuper = ts.Debug.deprecate(ts.factory.createSuper, factoryDeprecation);
    /** @deprecated Use `factory.createThis` or the factory supplied by your transformation context instead. */
    ts.createThis = ts.Debug.deprecate(ts.factory.createThis, factoryDeprecation);
    /** @deprecated Use `factory.createNull` or the factory supplied by your transformation context instead. */
    ts.createNull = ts.Debug.deprecate(ts.factory.createNull, factoryDeprecation);
    /** @deprecated Use `factory.createTrue` or the factory supplied by your transformation context instead. */
    ts.createTrue = ts.Debug.deprecate(ts.factory.createTrue, factoryDeprecation);
    /** @deprecated Use `factory.createFalse` or the factory supplied by your transformation context instead. */
    ts.createFalse = ts.Debug.deprecate(ts.factory.createFalse, factoryDeprecation);
    /** @deprecated Use `factory.createModifier` or the factory supplied by your transformation context instead. */
    ts.createModifier = ts.Debug.deprecate(ts.factory.createModifier, factoryDeprecation);
    /** @deprecated Use `factory.createModifiersFromModifierFlags` or the factory supplied by your transformation context instead. */
    ts.createModifiersFromModifierFlags = ts.Debug.deprecate(ts.factory.createModifiersFromModifierFlags, factoryDeprecation);
    /** @deprecated Use `factory.createQualifiedName` or the factory supplied by your transformation context instead. */
    ts.createQualifiedName = ts.Debug.deprecate(ts.factory.createQualifiedName, factoryDeprecation);
    /** @deprecated Use `factory.updateQualifiedName` or the factory supplied by your transformation context instead. */
    ts.updateQualifiedName = ts.Debug.deprecate(ts.factory.updateQualifiedName, factoryDeprecation);
    /** @deprecated Use `factory.createComputedPropertyName` or the factory supplied by your transformation context instead. */
    ts.createComputedPropertyName = ts.Debug.deprecate(ts.factory.createComputedPropertyName, factoryDeprecation);
    /** @deprecated Use `factory.updateComputedPropertyName` or the factory supplied by your transformation context instead. */
    ts.updateComputedPropertyName = ts.Debug.deprecate(ts.factory.updateComputedPropertyName, factoryDeprecation);
    /** @deprecated Use `factory.createTypeParameterDeclaration` or the factory supplied by your transformation context instead. */
    ts.createTypeParameterDeclaration = ts.Debug.deprecate(ts.factory.createTypeParameterDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeParameterDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateTypeParameterDeclaration = ts.Debug.deprecate(ts.factory.updateTypeParameterDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createParameterDeclaration` or the factory supplied by your transformation context instead. */
    ts.createParameter = ts.Debug.deprecate(ts.factory.createParameterDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateParameterDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateParameter = ts.Debug.deprecate(ts.factory.updateParameterDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createDecorator` or the factory supplied by your transformation context instead. */
    ts.createDecorator = ts.Debug.deprecate(ts.factory.createDecorator, factoryDeprecation);
    /** @deprecated Use `factory.updateDecorator` or the factory supplied by your transformation context instead. */
    ts.updateDecorator = ts.Debug.deprecate(ts.factory.updateDecorator, factoryDeprecation);
    /** @deprecated Use `factory.createPropertyDeclaration` or the factory supplied by your transformation context instead. */
    ts.createProperty = ts.Debug.deprecate(ts.factory.createPropertyDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updatePropertyDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateProperty = ts.Debug.deprecate(ts.factory.updatePropertyDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createMethodDeclaration` or the factory supplied by your transformation context instead. */
    ts.createMethod = ts.Debug.deprecate(ts.factory.createMethodDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateMethodDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateMethod = ts.Debug.deprecate(ts.factory.updateMethodDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createConstructorDeclaration` or the factory supplied by your transformation context instead. */
    ts.createConstructor = ts.Debug.deprecate(ts.factory.createConstructorDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateConstructorDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateConstructor = ts.Debug.deprecate(ts.factory.updateConstructorDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createGetAccessorDeclaration` or the factory supplied by your transformation context instead. */
    ts.createGetAccessor = ts.Debug.deprecate(ts.factory.createGetAccessorDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateGetAccessorDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateGetAccessor = ts.Debug.deprecate(ts.factory.updateGetAccessorDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createSetAccessorDeclaration` or the factory supplied by your transformation context instead. */
    ts.createSetAccessor = ts.Debug.deprecate(ts.factory.createSetAccessorDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateSetAccessorDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateSetAccessor = ts.Debug.deprecate(ts.factory.updateSetAccessorDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createCallSignature` or the factory supplied by your transformation context instead. */
    ts.createCallSignature = ts.Debug.deprecate(ts.factory.createCallSignature, factoryDeprecation);
    /** @deprecated Use `factory.updateCallSignature` or the factory supplied by your transformation context instead. */
    ts.updateCallSignature = ts.Debug.deprecate(ts.factory.updateCallSignature, factoryDeprecation);
    /** @deprecated Use `factory.createConstructSignature` or the factory supplied by your transformation context instead. */
    ts.createConstructSignature = ts.Debug.deprecate(ts.factory.createConstructSignature, factoryDeprecation);
    /** @deprecated Use `factory.updateConstructSignature` or the factory supplied by your transformation context instead. */
    ts.updateConstructSignature = ts.Debug.deprecate(ts.factory.updateConstructSignature, factoryDeprecation);
    /** @deprecated Use `factory.updateIndexSignature` or the factory supplied by your transformation context instead. */
    ts.updateIndexSignature = ts.Debug.deprecate(ts.factory.updateIndexSignature, factoryDeprecation);
    /** @deprecated Use `factory.createKeywordTypeNode` or the factory supplied by your transformation context instead. */
    ts.createKeywordTypeNode = ts.Debug.deprecate(ts.factory.createKeywordTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createTypePredicateNode` or the factory supplied by your transformation context instead. */
    ts.createTypePredicateNodeWithModifier = ts.Debug.deprecate(ts.factory.createTypePredicateNode, factoryDeprecation);
    /** @deprecated Use `factory.updateTypePredicateNode` or the factory supplied by your transformation context instead. */
    ts.updateTypePredicateNodeWithModifier = ts.Debug.deprecate(ts.factory.updateTypePredicateNode, factoryDeprecation);
    /** @deprecated Use `factory.createTypeReferenceNode` or the factory supplied by your transformation context instead. */
    ts.createTypeReferenceNode = ts.Debug.deprecate(ts.factory.createTypeReferenceNode, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeReferenceNode` or the factory supplied by your transformation context instead. */
    ts.updateTypeReferenceNode = ts.Debug.deprecate(ts.factory.updateTypeReferenceNode, factoryDeprecation);
    /** @deprecated Use `factory.createFunctionTypeNode` or the factory supplied by your transformation context instead. */
    ts.createFunctionTypeNode = ts.Debug.deprecate(ts.factory.createFunctionTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateFunctionTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateFunctionTypeNode = ts.Debug.deprecate(ts.factory.updateFunctionTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createConstructorTypeNode` or the factory supplied by your transformation context instead. */
    ts.createConstructorTypeNode = ts.Debug.deprecate(function (typeParameters, parameters, type) {
        return ts.factory.createConstructorTypeNode(/*modifiers*/ undefined, typeParameters, parameters, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateConstructorTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateConstructorTypeNode = ts.Debug.deprecate(function (node, typeParameters, parameters, type) {
        return ts.factory.updateConstructorTypeNode(node, node.modifiers, typeParameters, parameters, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createTypeQueryNode` or the factory supplied by your transformation context instead. */
    ts.createTypeQueryNode = ts.Debug.deprecate(ts.factory.createTypeQueryNode, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeQueryNode` or the factory supplied by your transformation context instead. */
    ts.updateTypeQueryNode = ts.Debug.deprecate(ts.factory.updateTypeQueryNode, factoryDeprecation);
    /** @deprecated Use `factory.createTypeLiteralNode` or the factory supplied by your transformation context instead. */
    ts.createTypeLiteralNode = ts.Debug.deprecate(ts.factory.createTypeLiteralNode, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeLiteralNode` or the factory supplied by your transformation context instead. */
    ts.updateTypeLiteralNode = ts.Debug.deprecate(ts.factory.updateTypeLiteralNode, factoryDeprecation);
    /** @deprecated Use `factory.createArrayTypeNode` or the factory supplied by your transformation context instead. */
    ts.createArrayTypeNode = ts.Debug.deprecate(ts.factory.createArrayTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateArrayTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateArrayTypeNode = ts.Debug.deprecate(ts.factory.updateArrayTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createTupleTypeNode` or the factory supplied by your transformation context instead. */
    ts.createTupleTypeNode = ts.Debug.deprecate(ts.factory.createTupleTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateTupleTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateTupleTypeNode = ts.Debug.deprecate(ts.factory.updateTupleTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createOptionalTypeNode` or the factory supplied by your transformation context instead. */
    ts.createOptionalTypeNode = ts.Debug.deprecate(ts.factory.createOptionalTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateOptionalTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateOptionalTypeNode = ts.Debug.deprecate(ts.factory.updateOptionalTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createRestTypeNode` or the factory supplied by your transformation context instead. */
    ts.createRestTypeNode = ts.Debug.deprecate(ts.factory.createRestTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateRestTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateRestTypeNode = ts.Debug.deprecate(ts.factory.updateRestTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createUnionTypeNode` or the factory supplied by your transformation context instead. */
    ts.createUnionTypeNode = ts.Debug.deprecate(ts.factory.createUnionTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateUnionTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateUnionTypeNode = ts.Debug.deprecate(ts.factory.updateUnionTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createIntersectionTypeNode` or the factory supplied by your transformation context instead. */
    ts.createIntersectionTypeNode = ts.Debug.deprecate(ts.factory.createIntersectionTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateIntersectionTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateIntersectionTypeNode = ts.Debug.deprecate(ts.factory.updateIntersectionTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createConditionalTypeNode` or the factory supplied by your transformation context instead. */
    ts.createConditionalTypeNode = ts.Debug.deprecate(ts.factory.createConditionalTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateConditionalTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateConditionalTypeNode = ts.Debug.deprecate(ts.factory.updateConditionalTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createInferTypeNode` or the factory supplied by your transformation context instead. */
    ts.createInferTypeNode = ts.Debug.deprecate(ts.factory.createInferTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateInferTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateInferTypeNode = ts.Debug.deprecate(ts.factory.updateInferTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createImportTypeNode` or the factory supplied by your transformation context instead. */
    ts.createImportTypeNode = ts.Debug.deprecate(ts.factory.createImportTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateImportTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateImportTypeNode = ts.Debug.deprecate(ts.factory.updateImportTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createParenthesizedType` or the factory supplied by your transformation context instead. */
    ts.createParenthesizedType = ts.Debug.deprecate(ts.factory.createParenthesizedType, factoryDeprecation);
    /** @deprecated Use `factory.updateParenthesizedType` or the factory supplied by your transformation context instead. */
    ts.updateParenthesizedType = ts.Debug.deprecate(ts.factory.updateParenthesizedType, factoryDeprecation);
    /** @deprecated Use `factory.createThisTypeNode` or the factory supplied by your transformation context instead. */
    ts.createThisTypeNode = ts.Debug.deprecate(ts.factory.createThisTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeOperatorNode` or the factory supplied by your transformation context instead. */
    ts.updateTypeOperatorNode = ts.Debug.deprecate(ts.factory.updateTypeOperatorNode, factoryDeprecation);
    /** @deprecated Use `factory.createIndexedAccessTypeNode` or the factory supplied by your transformation context instead. */
    ts.createIndexedAccessTypeNode = ts.Debug.deprecate(ts.factory.createIndexedAccessTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateIndexedAccessTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateIndexedAccessTypeNode = ts.Debug.deprecate(ts.factory.updateIndexedAccessTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createMappedTypeNode` or the factory supplied by your transformation context instead. */
    ts.createMappedTypeNode = ts.Debug.deprecate(ts.factory.createMappedTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateMappedTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateMappedTypeNode = ts.Debug.deprecate(ts.factory.updateMappedTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createLiteralTypeNode` or the factory supplied by your transformation context instead. */
    ts.createLiteralTypeNode = ts.Debug.deprecate(ts.factory.createLiteralTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.updateLiteralTypeNode` or the factory supplied by your transformation context instead. */
    ts.updateLiteralTypeNode = ts.Debug.deprecate(ts.factory.updateLiteralTypeNode, factoryDeprecation);
    /** @deprecated Use `factory.createObjectBindingPattern` or the factory supplied by your transformation context instead. */
    ts.createObjectBindingPattern = ts.Debug.deprecate(ts.factory.createObjectBindingPattern, factoryDeprecation);
    /** @deprecated Use `factory.updateObjectBindingPattern` or the factory supplied by your transformation context instead. */
    ts.updateObjectBindingPattern = ts.Debug.deprecate(ts.factory.updateObjectBindingPattern, factoryDeprecation);
    /** @deprecated Use `factory.createArrayBindingPattern` or the factory supplied by your transformation context instead. */
    ts.createArrayBindingPattern = ts.Debug.deprecate(ts.factory.createArrayBindingPattern, factoryDeprecation);
    /** @deprecated Use `factory.updateArrayBindingPattern` or the factory supplied by your transformation context instead. */
    ts.updateArrayBindingPattern = ts.Debug.deprecate(ts.factory.updateArrayBindingPattern, factoryDeprecation);
    /** @deprecated Use `factory.createBindingElement` or the factory supplied by your transformation context instead. */
    ts.createBindingElement = ts.Debug.deprecate(ts.factory.createBindingElement, factoryDeprecation);
    /** @deprecated Use `factory.updateBindingElement` or the factory supplied by your transformation context instead. */
    ts.updateBindingElement = ts.Debug.deprecate(ts.factory.updateBindingElement, factoryDeprecation);
    /** @deprecated Use `factory.createArrayLiteralExpression` or the factory supplied by your transformation context instead. */
    ts.createArrayLiteral = ts.Debug.deprecate(ts.factory.createArrayLiteralExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateArrayLiteralExpression` or the factory supplied by your transformation context instead. */
    ts.updateArrayLiteral = ts.Debug.deprecate(ts.factory.updateArrayLiteralExpression, factoryDeprecation);
    /** @deprecated Use `factory.createObjectLiteralExpression` or the factory supplied by your transformation context instead. */
    ts.createObjectLiteral = ts.Debug.deprecate(ts.factory.createObjectLiteralExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateObjectLiteralExpression` or the factory supplied by your transformation context instead. */
    ts.updateObjectLiteral = ts.Debug.deprecate(ts.factory.updateObjectLiteralExpression, factoryDeprecation);
    /** @deprecated Use `factory.createPropertyAccessExpression` or the factory supplied by your transformation context instead. */
    ts.createPropertyAccess = ts.Debug.deprecate(ts.factory.createPropertyAccessExpression, factoryDeprecation);
    /** @deprecated Use `factory.updatePropertyAccessExpression` or the factory supplied by your transformation context instead. */
    ts.updatePropertyAccess = ts.Debug.deprecate(ts.factory.updatePropertyAccessExpression, factoryDeprecation);
    /** @deprecated Use `factory.createPropertyAccessChain` or the factory supplied by your transformation context instead. */
    ts.createPropertyAccessChain = ts.Debug.deprecate(ts.factory.createPropertyAccessChain, factoryDeprecation);
    /** @deprecated Use `factory.updatePropertyAccessChain` or the factory supplied by your transformation context instead. */
    ts.updatePropertyAccessChain = ts.Debug.deprecate(ts.factory.updatePropertyAccessChain, factoryDeprecation);
    /** @deprecated Use `factory.createElementAccessExpression` or the factory supplied by your transformation context instead. */
    ts.createElementAccess = ts.Debug.deprecate(ts.factory.createElementAccessExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateElementAccessExpression` or the factory supplied by your transformation context instead. */
    ts.updateElementAccess = ts.Debug.deprecate(ts.factory.updateElementAccessExpression, factoryDeprecation);
    /** @deprecated Use `factory.createElementAccessChain` or the factory supplied by your transformation context instead. */
    ts.createElementAccessChain = ts.Debug.deprecate(ts.factory.createElementAccessChain, factoryDeprecation);
    /** @deprecated Use `factory.updateElementAccessChain` or the factory supplied by your transformation context instead. */
    ts.updateElementAccessChain = ts.Debug.deprecate(ts.factory.updateElementAccessChain, factoryDeprecation);
    /** @deprecated Use `factory.createCallExpression` or the factory supplied by your transformation context instead. */
    ts.createCall = ts.Debug.deprecate(ts.factory.createCallExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateCallExpression` or the factory supplied by your transformation context instead. */
    ts.updateCall = ts.Debug.deprecate(ts.factory.updateCallExpression, factoryDeprecation);
    /** @deprecated Use `factory.createCallChain` or the factory supplied by your transformation context instead. */
    ts.createCallChain = ts.Debug.deprecate(ts.factory.createCallChain, factoryDeprecation);
    /** @deprecated Use `factory.updateCallChain` or the factory supplied by your transformation context instead. */
    ts.updateCallChain = ts.Debug.deprecate(ts.factory.updateCallChain, factoryDeprecation);
    /** @deprecated Use `factory.createNewExpression` or the factory supplied by your transformation context instead. */
    ts.createNew = ts.Debug.deprecate(ts.factory.createNewExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateNewExpression` or the factory supplied by your transformation context instead. */
    ts.updateNew = ts.Debug.deprecate(ts.factory.updateNewExpression, factoryDeprecation);
    /** @deprecated Use `factory.createTypeAssertion` or the factory supplied by your transformation context instead. */
    ts.createTypeAssertion = ts.Debug.deprecate(ts.factory.createTypeAssertion, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeAssertion` or the factory supplied by your transformation context instead. */
    ts.updateTypeAssertion = ts.Debug.deprecate(ts.factory.updateTypeAssertion, factoryDeprecation);
    /** @deprecated Use `factory.createParenthesizedExpression` or the factory supplied by your transformation context instead. */
    ts.createParen = ts.Debug.deprecate(ts.factory.createParenthesizedExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateParenthesizedExpression` or the factory supplied by your transformation context instead. */
    ts.updateParen = ts.Debug.deprecate(ts.factory.updateParenthesizedExpression, factoryDeprecation);
    /** @deprecated Use `factory.createFunctionExpression` or the factory supplied by your transformation context instead. */
    ts.createFunctionExpression = ts.Debug.deprecate(ts.factory.createFunctionExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateFunctionExpression` or the factory supplied by your transformation context instead. */
    ts.updateFunctionExpression = ts.Debug.deprecate(ts.factory.updateFunctionExpression, factoryDeprecation);
    /** @deprecated Use `factory.createDeleteExpression` or the factory supplied by your transformation context instead. */
    ts.createDelete = ts.Debug.deprecate(ts.factory.createDeleteExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateDeleteExpression` or the factory supplied by your transformation context instead. */
    ts.updateDelete = ts.Debug.deprecate(ts.factory.updateDeleteExpression, factoryDeprecation);
    /** @deprecated Use `factory.createTypeOfExpression` or the factory supplied by your transformation context instead. */
    ts.createTypeOf = ts.Debug.deprecate(ts.factory.createTypeOfExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeOfExpression` or the factory supplied by your transformation context instead. */
    ts.updateTypeOf = ts.Debug.deprecate(ts.factory.updateTypeOfExpression, factoryDeprecation);
    /** @deprecated Use `factory.createVoidExpression` or the factory supplied by your transformation context instead. */
    ts.createVoid = ts.Debug.deprecate(ts.factory.createVoidExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateVoidExpression` or the factory supplied by your transformation context instead. */
    ts.updateVoid = ts.Debug.deprecate(ts.factory.updateVoidExpression, factoryDeprecation);
    /** @deprecated Use `factory.createAwaitExpression` or the factory supplied by your transformation context instead. */
    ts.createAwait = ts.Debug.deprecate(ts.factory.createAwaitExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateAwaitExpression` or the factory supplied by your transformation context instead. */
    ts.updateAwait = ts.Debug.deprecate(ts.factory.updateAwaitExpression, factoryDeprecation);
    /** @deprecated Use `factory.createPrefixExpression` or the factory supplied by your transformation context instead. */
    ts.createPrefix = ts.Debug.deprecate(ts.factory.createPrefixUnaryExpression, factoryDeprecation);
    /** @deprecated Use `factory.updatePrefixExpression` or the factory supplied by your transformation context instead. */
    ts.updatePrefix = ts.Debug.deprecate(ts.factory.updatePrefixUnaryExpression, factoryDeprecation);
    /** @deprecated Use `factory.createPostfixUnaryExpression` or the factory supplied by your transformation context instead. */
    ts.createPostfix = ts.Debug.deprecate(ts.factory.createPostfixUnaryExpression, factoryDeprecation);
    /** @deprecated Use `factory.updatePostfixUnaryExpression` or the factory supplied by your transformation context instead. */
    ts.updatePostfix = ts.Debug.deprecate(ts.factory.updatePostfixUnaryExpression, factoryDeprecation);
    /** @deprecated Use `factory.createBinaryExpression` or the factory supplied by your transformation context instead. */
    ts.createBinary = ts.Debug.deprecate(ts.factory.createBinaryExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateConditionalExpression` or the factory supplied by your transformation context instead. */
    ts.updateConditional = ts.Debug.deprecate(ts.factory.updateConditionalExpression, factoryDeprecation);
    /** @deprecated Use `factory.createTemplateExpression` or the factory supplied by your transformation context instead. */
    ts.createTemplateExpression = ts.Debug.deprecate(ts.factory.createTemplateExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateTemplateExpression` or the factory supplied by your transformation context instead. */
    ts.updateTemplateExpression = ts.Debug.deprecate(ts.factory.updateTemplateExpression, factoryDeprecation);
    /** @deprecated Use `factory.createTemplateHead` or the factory supplied by your transformation context instead. */
    ts.createTemplateHead = ts.Debug.deprecate(ts.factory.createTemplateHead, factoryDeprecation);
    /** @deprecated Use `factory.createTemplateMiddle` or the factory supplied by your transformation context instead. */
    ts.createTemplateMiddle = ts.Debug.deprecate(ts.factory.createTemplateMiddle, factoryDeprecation);
    /** @deprecated Use `factory.createTemplateTail` or the factory supplied by your transformation context instead. */
    ts.createTemplateTail = ts.Debug.deprecate(ts.factory.createTemplateTail, factoryDeprecation);
    /** @deprecated Use `factory.createNoSubstitutionTemplateLiteral` or the factory supplied by your transformation context instead. */
    ts.createNoSubstitutionTemplateLiteral = ts.Debug.deprecate(ts.factory.createNoSubstitutionTemplateLiteral, factoryDeprecation);
    /** @deprecated Use `factory.updateYieldExpression` or the factory supplied by your transformation context instead. */
    ts.updateYield = ts.Debug.deprecate(ts.factory.updateYieldExpression, factoryDeprecation);
    /** @deprecated Use `factory.createSpreadExpression` or the factory supplied by your transformation context instead. */
    ts.createSpread = ts.Debug.deprecate(ts.factory.createSpreadElement, factoryDeprecation);
    /** @deprecated Use `factory.updateSpreadExpression` or the factory supplied by your transformation context instead. */
    ts.updateSpread = ts.Debug.deprecate(ts.factory.updateSpreadElement, factoryDeprecation);
    /** @deprecated Use `factory.createOmittedExpression` or the factory supplied by your transformation context instead. */
    ts.createOmittedExpression = ts.Debug.deprecate(ts.factory.createOmittedExpression, factoryDeprecation);
    /** @deprecated Use `factory.createAsExpression` or the factory supplied by your transformation context instead. */
    ts.createAsExpression = ts.Debug.deprecate(ts.factory.createAsExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateAsExpression` or the factory supplied by your transformation context instead. */
    ts.updateAsExpression = ts.Debug.deprecate(ts.factory.updateAsExpression, factoryDeprecation);
    /** @deprecated Use `factory.createNonNullExpression` or the factory supplied by your transformation context instead. */
    ts.createNonNullExpression = ts.Debug.deprecate(ts.factory.createNonNullExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateNonNullExpression` or the factory supplied by your transformation context instead. */
    ts.updateNonNullExpression = ts.Debug.deprecate(ts.factory.updateNonNullExpression, factoryDeprecation);
    /** @deprecated Use `factory.createNonNullChain` or the factory supplied by your transformation context instead. */
    ts.createNonNullChain = ts.Debug.deprecate(ts.factory.createNonNullChain, factoryDeprecation);
    /** @deprecated Use `factory.updateNonNullChain` or the factory supplied by your transformation context instead. */
    ts.updateNonNullChain = ts.Debug.deprecate(ts.factory.updateNonNullChain, factoryDeprecation);
    /** @deprecated Use `factory.createMetaProperty` or the factory supplied by your transformation context instead. */
    ts.createMetaProperty = ts.Debug.deprecate(ts.factory.createMetaProperty, factoryDeprecation);
    /** @deprecated Use `factory.updateMetaProperty` or the factory supplied by your transformation context instead. */
    ts.updateMetaProperty = ts.Debug.deprecate(ts.factory.updateMetaProperty, factoryDeprecation);
    /** @deprecated Use `factory.createTemplateSpan` or the factory supplied by your transformation context instead. */
    ts.createTemplateSpan = ts.Debug.deprecate(ts.factory.createTemplateSpan, factoryDeprecation);
    /** @deprecated Use `factory.updateTemplateSpan` or the factory supplied by your transformation context instead. */
    ts.updateTemplateSpan = ts.Debug.deprecate(ts.factory.updateTemplateSpan, factoryDeprecation);
    /** @deprecated Use `factory.createSemicolonClassElement` or the factory supplied by your transformation context instead. */
    ts.createSemicolonClassElement = ts.Debug.deprecate(ts.factory.createSemicolonClassElement, factoryDeprecation);
    /** @deprecated Use `factory.createBlock` or the factory supplied by your transformation context instead. */
    ts.createBlock = ts.Debug.deprecate(ts.factory.createBlock, factoryDeprecation);
    /** @deprecated Use `factory.updateBlock` or the factory supplied by your transformation context instead. */
    ts.updateBlock = ts.Debug.deprecate(ts.factory.updateBlock, factoryDeprecation);
    /** @deprecated Use `factory.createVariableStatement` or the factory supplied by your transformation context instead. */
    ts.createVariableStatement = ts.Debug.deprecate(ts.factory.createVariableStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateVariableStatement` or the factory supplied by your transformation context instead. */
    ts.updateVariableStatement = ts.Debug.deprecate(ts.factory.updateVariableStatement, factoryDeprecation);
    /** @deprecated Use `factory.createEmptyStatement` or the factory supplied by your transformation context instead. */
    ts.createEmptyStatement = ts.Debug.deprecate(ts.factory.createEmptyStatement, factoryDeprecation);
    /** @deprecated Use `factory.createExpressionStatement` or the factory supplied by your transformation context instead. */
    ts.createExpressionStatement = ts.Debug.deprecate(ts.factory.createExpressionStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateExpressionStatement` or the factory supplied by your transformation context instead. */
    ts.updateExpressionStatement = ts.Debug.deprecate(ts.factory.updateExpressionStatement, factoryDeprecation);
    /** @deprecated Use `factory.createExpressionStatement` or the factory supplied by your transformation context instead. */
    ts.createStatement = ts.Debug.deprecate(ts.factory.createExpressionStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateExpressionStatement` or the factory supplied by your transformation context instead. */
    ts.updateStatement = ts.Debug.deprecate(ts.factory.updateExpressionStatement, factoryDeprecation);
    /** @deprecated Use `factory.createIfStatement` or the factory supplied by your transformation context instead. */
    ts.createIf = ts.Debug.deprecate(ts.factory.createIfStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateIfStatement` or the factory supplied by your transformation context instead. */
    ts.updateIf = ts.Debug.deprecate(ts.factory.updateIfStatement, factoryDeprecation);
    /** @deprecated Use `factory.createDoStatement` or the factory supplied by your transformation context instead. */
    ts.createDo = ts.Debug.deprecate(ts.factory.createDoStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateDoStatement` or the factory supplied by your transformation context instead. */
    ts.updateDo = ts.Debug.deprecate(ts.factory.updateDoStatement, factoryDeprecation);
    /** @deprecated Use `factory.createWhileStatement` or the factory supplied by your transformation context instead. */
    ts.createWhile = ts.Debug.deprecate(ts.factory.createWhileStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateWhileStatement` or the factory supplied by your transformation context instead. */
    ts.updateWhile = ts.Debug.deprecate(ts.factory.updateWhileStatement, factoryDeprecation);
    /** @deprecated Use `factory.createForStatement` or the factory supplied by your transformation context instead. */
    ts.createFor = ts.Debug.deprecate(ts.factory.createForStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateForStatement` or the factory supplied by your transformation context instead. */
    ts.updateFor = ts.Debug.deprecate(ts.factory.updateForStatement, factoryDeprecation);
    /** @deprecated Use `factory.createForInStatement` or the factory supplied by your transformation context instead. */
    ts.createForIn = ts.Debug.deprecate(ts.factory.createForInStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateForInStatement` or the factory supplied by your transformation context instead. */
    ts.updateForIn = ts.Debug.deprecate(ts.factory.updateForInStatement, factoryDeprecation);
    /** @deprecated Use `factory.createForOfStatement` or the factory supplied by your transformation context instead. */
    ts.createForOf = ts.Debug.deprecate(ts.factory.createForOfStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateForOfStatement` or the factory supplied by your transformation context instead. */
    ts.updateForOf = ts.Debug.deprecate(ts.factory.updateForOfStatement, factoryDeprecation);
    /** @deprecated Use `factory.createContinueStatement` or the factory supplied by your transformation context instead. */
    ts.createContinue = ts.Debug.deprecate(ts.factory.createContinueStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateContinueStatement` or the factory supplied by your transformation context instead. */
    ts.updateContinue = ts.Debug.deprecate(ts.factory.updateContinueStatement, factoryDeprecation);
    /** @deprecated Use `factory.createBreakStatement` or the factory supplied by your transformation context instead. */
    ts.createBreak = ts.Debug.deprecate(ts.factory.createBreakStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateBreakStatement` or the factory supplied by your transformation context instead. */
    ts.updateBreak = ts.Debug.deprecate(ts.factory.updateBreakStatement, factoryDeprecation);
    /** @deprecated Use `factory.createReturnStatement` or the factory supplied by your transformation context instead. */
    ts.createReturn = ts.Debug.deprecate(ts.factory.createReturnStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateReturnStatement` or the factory supplied by your transformation context instead. */
    ts.updateReturn = ts.Debug.deprecate(ts.factory.updateReturnStatement, factoryDeprecation);
    /** @deprecated Use `factory.createWithStatement` or the factory supplied by your transformation context instead. */
    ts.createWith = ts.Debug.deprecate(ts.factory.createWithStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateWithStatement` or the factory supplied by your transformation context instead. */
    ts.updateWith = ts.Debug.deprecate(ts.factory.updateWithStatement, factoryDeprecation);
    /** @deprecated Use `factory.createSwitchStatement` or the factory supplied by your transformation context instead. */
    ts.createSwitch = ts.Debug.deprecate(ts.factory.createSwitchStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateSwitchStatement` or the factory supplied by your transformation context instead. */
    ts.updateSwitch = ts.Debug.deprecate(ts.factory.updateSwitchStatement, factoryDeprecation);
    /** @deprecated Use `factory.createLabelStatement` or the factory supplied by your transformation context instead. */
    ts.createLabel = ts.Debug.deprecate(ts.factory.createLabeledStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateLabelStatement` or the factory supplied by your transformation context instead. */
    ts.updateLabel = ts.Debug.deprecate(ts.factory.updateLabeledStatement, factoryDeprecation);
    /** @deprecated Use `factory.createThrowStatement` or the factory supplied by your transformation context instead. */
    ts.createThrow = ts.Debug.deprecate(ts.factory.createThrowStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateThrowStatement` or the factory supplied by your transformation context instead. */
    ts.updateThrow = ts.Debug.deprecate(ts.factory.updateThrowStatement, factoryDeprecation);
    /** @deprecated Use `factory.createTryStatement` or the factory supplied by your transformation context instead. */
    ts.createTry = ts.Debug.deprecate(ts.factory.createTryStatement, factoryDeprecation);
    /** @deprecated Use `factory.updateTryStatement` or the factory supplied by your transformation context instead. */
    ts.updateTry = ts.Debug.deprecate(ts.factory.updateTryStatement, factoryDeprecation);
    /** @deprecated Use `factory.createDebuggerStatement` or the factory supplied by your transformation context instead. */
    ts.createDebuggerStatement = ts.Debug.deprecate(ts.factory.createDebuggerStatement, factoryDeprecation);
    /** @deprecated Use `factory.createVariableDeclarationList` or the factory supplied by your transformation context instead. */
    ts.createVariableDeclarationList = ts.Debug.deprecate(ts.factory.createVariableDeclarationList, factoryDeprecation);
    /** @deprecated Use `factory.updateVariableDeclarationList` or the factory supplied by your transformation context instead. */
    ts.updateVariableDeclarationList = ts.Debug.deprecate(ts.factory.updateVariableDeclarationList, factoryDeprecation);
    /** @deprecated Use `factory.createFunctionDeclaration` or the factory supplied by your transformation context instead. */
    ts.createFunctionDeclaration = ts.Debug.deprecate(ts.factory.createFunctionDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateFunctionDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateFunctionDeclaration = ts.Debug.deprecate(ts.factory.updateFunctionDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createClassDeclaration` or the factory supplied by your transformation context instead. */
    ts.createClassDeclaration = ts.Debug.deprecate(ts.factory.createClassDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateClassDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateClassDeclaration = ts.Debug.deprecate(ts.factory.updateClassDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createInterfaceDeclaration` or the factory supplied by your transformation context instead. */
    ts.createInterfaceDeclaration = ts.Debug.deprecate(ts.factory.createInterfaceDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateInterfaceDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateInterfaceDeclaration = ts.Debug.deprecate(ts.factory.updateInterfaceDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createTypeAliasDeclaration` or the factory supplied by your transformation context instead. */
    ts.createTypeAliasDeclaration = ts.Debug.deprecate(ts.factory.createTypeAliasDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateTypeAliasDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateTypeAliasDeclaration = ts.Debug.deprecate(ts.factory.updateTypeAliasDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createEnumDeclaration` or the factory supplied by your transformation context instead. */
    ts.createEnumDeclaration = ts.Debug.deprecate(ts.factory.createEnumDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateEnumDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateEnumDeclaration = ts.Debug.deprecate(ts.factory.updateEnumDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createModuleDeclaration` or the factory supplied by your transformation context instead. */
    ts.createModuleDeclaration = ts.Debug.deprecate(ts.factory.createModuleDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateModuleDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateModuleDeclaration = ts.Debug.deprecate(ts.factory.updateModuleDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createModuleBlock` or the factory supplied by your transformation context instead. */
    ts.createModuleBlock = ts.Debug.deprecate(ts.factory.createModuleBlock, factoryDeprecation);
    /** @deprecated Use `factory.updateModuleBlock` or the factory supplied by your transformation context instead. */
    ts.updateModuleBlock = ts.Debug.deprecate(ts.factory.updateModuleBlock, factoryDeprecation);
    /** @deprecated Use `factory.createCaseBlock` or the factory supplied by your transformation context instead. */
    ts.createCaseBlock = ts.Debug.deprecate(ts.factory.createCaseBlock, factoryDeprecation);
    /** @deprecated Use `factory.updateCaseBlock` or the factory supplied by your transformation context instead. */
    ts.updateCaseBlock = ts.Debug.deprecate(ts.factory.updateCaseBlock, factoryDeprecation);
    /** @deprecated Use `factory.createNamespaceExportDeclaration` or the factory supplied by your transformation context instead. */
    ts.createNamespaceExportDeclaration = ts.Debug.deprecate(ts.factory.createNamespaceExportDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateNamespaceExportDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateNamespaceExportDeclaration = ts.Debug.deprecate(ts.factory.updateNamespaceExportDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createImportEqualsDeclaration` or the factory supplied by your transformation context instead. */
    ts.createImportEqualsDeclaration = ts.Debug.deprecate(ts.factory.createImportEqualsDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateImportEqualsDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateImportEqualsDeclaration = ts.Debug.deprecate(ts.factory.updateImportEqualsDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createImportDeclaration` or the factory supplied by your transformation context instead. */
    ts.createImportDeclaration = ts.Debug.deprecate(ts.factory.createImportDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.updateImportDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateImportDeclaration = ts.Debug.deprecate(ts.factory.updateImportDeclaration, factoryDeprecation);
    /** @deprecated Use `factory.createNamespaceImport` or the factory supplied by your transformation context instead. */
    ts.createNamespaceImport = ts.Debug.deprecate(ts.factory.createNamespaceImport, factoryDeprecation);
    /** @deprecated Use `factory.updateNamespaceImport` or the factory supplied by your transformation context instead. */
    ts.updateNamespaceImport = ts.Debug.deprecate(ts.factory.updateNamespaceImport, factoryDeprecation);
    /** @deprecated Use `factory.createNamedImports` or the factory supplied by your transformation context instead. */
    ts.createNamedImports = ts.Debug.deprecate(ts.factory.createNamedImports, factoryDeprecation);
    /** @deprecated Use `factory.updateNamedImports` or the factory supplied by your transformation context instead. */
    ts.updateNamedImports = ts.Debug.deprecate(ts.factory.updateNamedImports, factoryDeprecation);
    /** @deprecated Use `factory.createImportSpecifier` or the factory supplied by your transformation context instead. */
    ts.createImportSpecifier = ts.Debug.deprecate(ts.factory.createImportSpecifier, factoryDeprecation);
    /** @deprecated Use `factory.updateImportSpecifier` or the factory supplied by your transformation context instead. */
    ts.updateImportSpecifier = ts.Debug.deprecate(ts.factory.updateImportSpecifier, factoryDeprecation);
    /** @deprecated Use `factory.createExportAssignment` or the factory supplied by your transformation context instead. */
    ts.createExportAssignment = ts.Debug.deprecate(ts.factory.createExportAssignment, factoryDeprecation);
    /** @deprecated Use `factory.updateExportAssignment` or the factory supplied by your transformation context instead. */
    ts.updateExportAssignment = ts.Debug.deprecate(ts.factory.updateExportAssignment, factoryDeprecation);
    /** @deprecated Use `factory.createNamedExports` or the factory supplied by your transformation context instead. */
    ts.createNamedExports = ts.Debug.deprecate(ts.factory.createNamedExports, factoryDeprecation);
    /** @deprecated Use `factory.updateNamedExports` or the factory supplied by your transformation context instead. */
    ts.updateNamedExports = ts.Debug.deprecate(ts.factory.updateNamedExports, factoryDeprecation);
    /** @deprecated Use `factory.createExportSpecifier` or the factory supplied by your transformation context instead. */
    ts.createExportSpecifier = ts.Debug.deprecate(ts.factory.createExportSpecifier, factoryDeprecation);
    /** @deprecated Use `factory.updateExportSpecifier` or the factory supplied by your transformation context instead. */
    ts.updateExportSpecifier = ts.Debug.deprecate(ts.factory.updateExportSpecifier, factoryDeprecation);
    /** @deprecated Use `factory.createExternalModuleReference` or the factory supplied by your transformation context instead. */
    ts.createExternalModuleReference = ts.Debug.deprecate(ts.factory.createExternalModuleReference, factoryDeprecation);
    /** @deprecated Use `factory.updateExternalModuleReference` or the factory supplied by your transformation context instead. */
    ts.updateExternalModuleReference = ts.Debug.deprecate(ts.factory.updateExternalModuleReference, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocTypeExpression` or the factory supplied by your transformation context instead. */
    ts.createJSDocTypeExpression = ts.Debug.deprecate(ts.factory.createJSDocTypeExpression, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocTypeTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocTypeTag = ts.Debug.deprecate(ts.factory.createJSDocTypeTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocReturnTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocReturnTag = ts.Debug.deprecate(ts.factory.createJSDocReturnTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocThisTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocThisTag = ts.Debug.deprecate(ts.factory.createJSDocThisTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocComment` or the factory supplied by your transformation context instead. */
    ts.createJSDocComment = ts.Debug.deprecate(ts.factory.createJSDocComment, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocParameterTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocParameterTag = ts.Debug.deprecate(ts.factory.createJSDocParameterTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocClassTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocClassTag = ts.Debug.deprecate(ts.factory.createJSDocClassTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocAugmentsTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocAugmentsTag = ts.Debug.deprecate(ts.factory.createJSDocAugmentsTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocEnumTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocEnumTag = ts.Debug.deprecate(ts.factory.createJSDocEnumTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocTemplateTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocTemplateTag = ts.Debug.deprecate(ts.factory.createJSDocTemplateTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocTypedefTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocTypedefTag = ts.Debug.deprecate(ts.factory.createJSDocTypedefTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocCallbackTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocCallbackTag = ts.Debug.deprecate(ts.factory.createJSDocCallbackTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocSignature` or the factory supplied by your transformation context instead. */
    ts.createJSDocSignature = ts.Debug.deprecate(ts.factory.createJSDocSignature, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocPropertyTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocPropertyTag = ts.Debug.deprecate(ts.factory.createJSDocPropertyTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocTypeLiteral` or the factory supplied by your transformation context instead. */
    ts.createJSDocTypeLiteral = ts.Debug.deprecate(ts.factory.createJSDocTypeLiteral, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocImplementsTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocImplementsTag = ts.Debug.deprecate(ts.factory.createJSDocImplementsTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocAuthorTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocAuthorTag = ts.Debug.deprecate(ts.factory.createJSDocAuthorTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocPublicTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocPublicTag = ts.Debug.deprecate(ts.factory.createJSDocPublicTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocPrivateTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocPrivateTag = ts.Debug.deprecate(ts.factory.createJSDocPrivateTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocProtectedTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocProtectedTag = ts.Debug.deprecate(ts.factory.createJSDocProtectedTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocReadonlyTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocReadonlyTag = ts.Debug.deprecate(ts.factory.createJSDocReadonlyTag, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocUnknownTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocTag = ts.Debug.deprecate(ts.factory.createJSDocUnknownTag, factoryDeprecation);
    /** @deprecated Use `factory.createJsxElement` or the factory supplied by your transformation context instead. */
    ts.createJsxElement = ts.Debug.deprecate(ts.factory.createJsxElement, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxElement` or the factory supplied by your transformation context instead. */
    ts.updateJsxElement = ts.Debug.deprecate(ts.factory.updateJsxElement, factoryDeprecation);
    /** @deprecated Use `factory.createJsxSelfClosingElement` or the factory supplied by your transformation context instead. */
    ts.createJsxSelfClosingElement = ts.Debug.deprecate(ts.factory.createJsxSelfClosingElement, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxSelfClosingElement` or the factory supplied by your transformation context instead. */
    ts.updateJsxSelfClosingElement = ts.Debug.deprecate(ts.factory.updateJsxSelfClosingElement, factoryDeprecation);
    /** @deprecated Use `factory.createJsxOpeningElement` or the factory supplied by your transformation context instead. */
    ts.createJsxOpeningElement = ts.Debug.deprecate(ts.factory.createJsxOpeningElement, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxOpeningElement` or the factory supplied by your transformation context instead. */
    ts.updateJsxOpeningElement = ts.Debug.deprecate(ts.factory.updateJsxOpeningElement, factoryDeprecation);
    /** @deprecated Use `factory.createJsxClosingElement` or the factory supplied by your transformation context instead. */
    ts.createJsxClosingElement = ts.Debug.deprecate(ts.factory.createJsxClosingElement, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxClosingElement` or the factory supplied by your transformation context instead. */
    ts.updateJsxClosingElement = ts.Debug.deprecate(ts.factory.updateJsxClosingElement, factoryDeprecation);
    /** @deprecated Use `factory.createJsxFragment` or the factory supplied by your transformation context instead. */
    ts.createJsxFragment = ts.Debug.deprecate(ts.factory.createJsxFragment, factoryDeprecation);
    /** @deprecated Use `factory.createJsxText` or the factory supplied by your transformation context instead. */
    ts.createJsxText = ts.Debug.deprecate(ts.factory.createJsxText, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxText` or the factory supplied by your transformation context instead. */
    ts.updateJsxText = ts.Debug.deprecate(ts.factory.updateJsxText, factoryDeprecation);
    /** @deprecated Use `factory.createJsxOpeningFragment` or the factory supplied by your transformation context instead. */
    ts.createJsxOpeningFragment = ts.Debug.deprecate(ts.factory.createJsxOpeningFragment, factoryDeprecation);
    /** @deprecated Use `factory.createJsxJsxClosingFragment` or the factory supplied by your transformation context instead. */
    ts.createJsxJsxClosingFragment = ts.Debug.deprecate(ts.factory.createJsxJsxClosingFragment, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxFragment` or the factory supplied by your transformation context instead. */
    ts.updateJsxFragment = ts.Debug.deprecate(ts.factory.updateJsxFragment, factoryDeprecation);
    /** @deprecated Use `factory.createJsxAttribute` or the factory supplied by your transformation context instead. */
    ts.createJsxAttribute = ts.Debug.deprecate(ts.factory.createJsxAttribute, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxAttribute` or the factory supplied by your transformation context instead. */
    ts.updateJsxAttribute = ts.Debug.deprecate(ts.factory.updateJsxAttribute, factoryDeprecation);
    /** @deprecated Use `factory.createJsxAttributes` or the factory supplied by your transformation context instead. */
    ts.createJsxAttributes = ts.Debug.deprecate(ts.factory.createJsxAttributes, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxAttributes` or the factory supplied by your transformation context instead. */
    ts.updateJsxAttributes = ts.Debug.deprecate(ts.factory.updateJsxAttributes, factoryDeprecation);
    /** @deprecated Use `factory.createJsxSpreadAttribute` or the factory supplied by your transformation context instead. */
    ts.createJsxSpreadAttribute = ts.Debug.deprecate(ts.factory.createJsxSpreadAttribute, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxSpreadAttribute` or the factory supplied by your transformation context instead. */
    ts.updateJsxSpreadAttribute = ts.Debug.deprecate(ts.factory.updateJsxSpreadAttribute, factoryDeprecation);
    /** @deprecated Use `factory.createJsxExpression` or the factory supplied by your transformation context instead. */
    ts.createJsxExpression = ts.Debug.deprecate(ts.factory.createJsxExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateJsxExpression` or the factory supplied by your transformation context instead. */
    ts.updateJsxExpression = ts.Debug.deprecate(ts.factory.updateJsxExpression, factoryDeprecation);
    /** @deprecated Use `factory.createCaseClause` or the factory supplied by your transformation context instead. */
    ts.createCaseClause = ts.Debug.deprecate(ts.factory.createCaseClause, factoryDeprecation);
    /** @deprecated Use `factory.updateCaseClause` or the factory supplied by your transformation context instead. */
    ts.updateCaseClause = ts.Debug.deprecate(ts.factory.updateCaseClause, factoryDeprecation);
    /** @deprecated Use `factory.createDefaultClause` or the factory supplied by your transformation context instead. */
    ts.createDefaultClause = ts.Debug.deprecate(ts.factory.createDefaultClause, factoryDeprecation);
    /** @deprecated Use `factory.updateDefaultClause` or the factory supplied by your transformation context instead. */
    ts.updateDefaultClause = ts.Debug.deprecate(ts.factory.updateDefaultClause, factoryDeprecation);
    /** @deprecated Use `factory.createHeritageClause` or the factory supplied by your transformation context instead. */
    ts.createHeritageClause = ts.Debug.deprecate(ts.factory.createHeritageClause, factoryDeprecation);
    /** @deprecated Use `factory.updateHeritageClause` or the factory supplied by your transformation context instead. */
    ts.updateHeritageClause = ts.Debug.deprecate(ts.factory.updateHeritageClause, factoryDeprecation);
    /** @deprecated Use `factory.createCatchClause` or the factory supplied by your transformation context instead. */
    ts.createCatchClause = ts.Debug.deprecate(ts.factory.createCatchClause, factoryDeprecation);
    /** @deprecated Use `factory.updateCatchClause` or the factory supplied by your transformation context instead. */
    ts.updateCatchClause = ts.Debug.deprecate(ts.factory.updateCatchClause, factoryDeprecation);
    /** @deprecated Use `factory.createPropertyAssignment` or the factory supplied by your transformation context instead. */
    ts.createPropertyAssignment = ts.Debug.deprecate(ts.factory.createPropertyAssignment, factoryDeprecation);
    /** @deprecated Use `factory.updatePropertyAssignment` or the factory supplied by your transformation context instead. */
    ts.updatePropertyAssignment = ts.Debug.deprecate(ts.factory.updatePropertyAssignment, factoryDeprecation);
    /** @deprecated Use `factory.createShorthandPropertyAssignment` or the factory supplied by your transformation context instead. */
    ts.createShorthandPropertyAssignment = ts.Debug.deprecate(ts.factory.createShorthandPropertyAssignment, factoryDeprecation);
    /** @deprecated Use `factory.updateShorthandPropertyAssignment` or the factory supplied by your transformation context instead. */
    ts.updateShorthandPropertyAssignment = ts.Debug.deprecate(ts.factory.updateShorthandPropertyAssignment, factoryDeprecation);
    /** @deprecated Use `factory.createSpreadAssignment` or the factory supplied by your transformation context instead. */
    ts.createSpreadAssignment = ts.Debug.deprecate(ts.factory.createSpreadAssignment, factoryDeprecation);
    /** @deprecated Use `factory.updateSpreadAssignment` or the factory supplied by your transformation context instead. */
    ts.updateSpreadAssignment = ts.Debug.deprecate(ts.factory.updateSpreadAssignment, factoryDeprecation);
    /** @deprecated Use `factory.createEnumMember` or the factory supplied by your transformation context instead. */
    ts.createEnumMember = ts.Debug.deprecate(ts.factory.createEnumMember, factoryDeprecation);
    /** @deprecated Use `factory.updateEnumMember` or the factory supplied by your transformation context instead. */
    ts.updateEnumMember = ts.Debug.deprecate(ts.factory.updateEnumMember, factoryDeprecation);
    /** @deprecated Use `factory.updateSourceFile` or the factory supplied by your transformation context instead. */
    ts.updateSourceFileNode = ts.Debug.deprecate(ts.factory.updateSourceFile, factoryDeprecation);
    /** @deprecated Use `factory.createNotEmittedStatement` or the factory supplied by your transformation context instead. */
    ts.createNotEmittedStatement = ts.Debug.deprecate(ts.factory.createNotEmittedStatement, factoryDeprecation);
    /** @deprecated Use `factory.createPartiallyEmittedExpression` or the factory supplied by your transformation context instead. */
    ts.createPartiallyEmittedExpression = ts.Debug.deprecate(ts.factory.createPartiallyEmittedExpression, factoryDeprecation);
    /** @deprecated Use `factory.updatePartiallyEmittedExpression` or the factory supplied by your transformation context instead. */
    ts.updatePartiallyEmittedExpression = ts.Debug.deprecate(ts.factory.updatePartiallyEmittedExpression, factoryDeprecation);
    /** @deprecated Use `factory.createCommaListExpression` or the factory supplied by your transformation context instead. */
    ts.createCommaList = ts.Debug.deprecate(ts.factory.createCommaListExpression, factoryDeprecation);
    /** @deprecated Use `factory.updateCommaListExpression` or the factory supplied by your transformation context instead. */
    ts.updateCommaList = ts.Debug.deprecate(ts.factory.updateCommaListExpression, factoryDeprecation);
    /** @deprecated Use `factory.createBundle` or the factory supplied by your transformation context instead. */
    ts.createBundle = ts.Debug.deprecate(ts.factory.createBundle, factoryDeprecation);
    /** @deprecated Use `factory.updateBundle` or the factory supplied by your transformation context instead. */
    ts.updateBundle = ts.Debug.deprecate(ts.factory.updateBundle, factoryDeprecation);
    /** @deprecated Use `factory.createImmediatelyInvokedFunctionExpression` or the factory supplied by your transformation context instead. */
    ts.createImmediatelyInvokedFunctionExpression = ts.Debug.deprecate(ts.factory.createImmediatelyInvokedFunctionExpression, factoryDeprecation);
    /** @deprecated Use `factory.createImmediatelyInvokedArrowFunction` or the factory supplied by your transformation context instead. */
    ts.createImmediatelyInvokedArrowFunction = ts.Debug.deprecate(ts.factory.createImmediatelyInvokedArrowFunction, factoryDeprecation);
    /** @deprecated Use `factory.createVoidZero` or the factory supplied by your transformation context instead. */
    ts.createVoidZero = ts.Debug.deprecate(ts.factory.createVoidZero, factoryDeprecation);
    /** @deprecated Use `factory.createExportDefault` or the factory supplied by your transformation context instead. */
    ts.createExportDefault = ts.Debug.deprecate(ts.factory.createExportDefault, factoryDeprecation);
    /** @deprecated Use `factory.createExternalModuleExport` or the factory supplied by your transformation context instead. */
    ts.createExternalModuleExport = ts.Debug.deprecate(ts.factory.createExternalModuleExport, factoryDeprecation);
    /** @deprecated Use `factory.createNamespaceExport` or the factory supplied by your transformation context instead. */
    ts.createNamespaceExport = ts.Debug.deprecate(ts.factory.createNamespaceExport, factoryDeprecation);
    /** @deprecated Use `factory.updateNamespaceExport` or the factory supplied by your transformation context instead. */
    ts.updateNamespaceExport = ts.Debug.deprecate(ts.factory.updateNamespaceExport, factoryDeprecation);
    /** @deprecated Use `factory.createToken` or the factory supplied by your transformation context instead. */
    ts.createToken = ts.Debug.deprecate(function createToken(kind) {
        return ts.factory.createToken(kind);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createIdentifier` or the factory supplied by your transformation context instead. */
    ts.createIdentifier = ts.Debug.deprecate(function createIdentifier(text) {
        return ts.factory.createIdentifier(text, /*typeArguments*/ undefined, /*originalKeywordKind*/ undefined);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createTempVariable` or the factory supplied by your transformation context instead. */
    ts.createTempVariable = ts.Debug.deprecate(function createTempVariable(recordTempVariable) {
        return ts.factory.createTempVariable(recordTempVariable, /*reserveInNestedScopes*/ undefined);
    }, factoryDeprecation);
    /** @deprecated Use `factory.getGeneratedNameForNode` or the factory supplied by your transformation context instead. */
    ts.getGeneratedNameForNode = ts.Debug.deprecate(function getGeneratedNameForNode(node) {
        return ts.factory.getGeneratedNameForNode(node, /*flags*/ undefined);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createUniqueName(text, GeneratedIdentifierFlags.Optimistic)` or the factory supplied by your transformation context instead. */
    ts.createOptimisticUniqueName = ts.Debug.deprecate(function createOptimisticUniqueName(text) {
        return ts.factory.createUniqueName(text, 16 /* GeneratedIdentifierFlags.Optimistic */);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createUniqueName(text, GeneratedIdentifierFlags.Optimistic | GeneratedIdentifierFlags.FileLevel)` or the factory supplied by your transformation context instead. */
    ts.createFileLevelUniqueName = ts.Debug.deprecate(function createFileLevelUniqueName(text) {
        return ts.factory.createUniqueName(text, 16 /* GeneratedIdentifierFlags.Optimistic */ | 32 /* GeneratedIdentifierFlags.FileLevel */);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createIndexSignature` or the factory supplied by your transformation context instead. */
    ts.createIndexSignature = ts.Debug.deprecate(function createIndexSignature(decorators, modifiers, parameters, type) {
        return ts.factory.createIndexSignature(decorators, modifiers, parameters, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createTypePredicateNode` or the factory supplied by your transformation context instead. */
    ts.createTypePredicateNode = ts.Debug.deprecate(function createTypePredicateNode(parameterName, type) {
        return ts.factory.createTypePredicateNode(/*assertsModifier*/ undefined, parameterName, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateTypePredicateNode` or the factory supplied by your transformation context instead. */
    ts.updateTypePredicateNode = ts.Debug.deprecate(function updateTypePredicateNode(node, parameterName, type) {
        return ts.factory.updateTypePredicateNode(node, /*assertsModifier*/ undefined, parameterName, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createStringLiteral`, `factory.createStringLiteralFromNode`, `factory.createNumericLiteral`, `factory.createBigIntLiteral`, `factory.createTrue`, `factory.createFalse`, or the factory supplied by your transformation context instead. */
    ts.createLiteral = ts.Debug.deprecate(function createLiteral(value) {
        if (typeof value === "number") {
            return ts.factory.createNumericLiteral(value);
        }
        // eslint-disable-next-line local/no-in-operator
        if (typeof value === "object" && "base10Value" in value) { // PseudoBigInt
            return ts.factory.createBigIntLiteral(value);
        }
        if (typeof value === "boolean") {
            return value ? ts.factory.createTrue() : ts.factory.createFalse();
        }
        if (typeof value === "string") {
            return ts.factory.createStringLiteral(value, /*isSingleQuote*/ undefined);
        }
        return ts.factory.createStringLiteralFromNode(value);
    }, { since: "4.0", warnAfter: "4.1", message: "Use `factory.createStringLiteral`, `factory.createStringLiteralFromNode`, `factory.createNumericLiteral`, `factory.createBigIntLiteral`, `factory.createTrue`, `factory.createFalse`, or the factory supplied by your transformation context instead." });
    /** @deprecated Use `factory.createMethodSignature` or the factory supplied by your transformation context instead. */
    ts.createMethodSignature = ts.Debug.deprecate(function createMethodSignature(typeParameters, parameters, type, name, questionToken) {
        return ts.factory.createMethodSignature(/*modifiers*/ undefined, name, questionToken, typeParameters, parameters, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateMethodSignature` or the factory supplied by your transformation context instead. */
    ts.updateMethodSignature = ts.Debug.deprecate(function updateMethodSignature(node, typeParameters, parameters, type, name, questionToken) {
        return ts.factory.updateMethodSignature(node, node.modifiers, name, questionToken, typeParameters, parameters, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createTypeOperatorNode` or the factory supplied by your transformation context instead. */
    ts.createTypeOperatorNode = ts.Debug.deprecate(function createTypeOperatorNode(operatorOrType, type) {
        var operator;
        if (type) {
            operator = operatorOrType;
        }
        else {
            type = operatorOrType;
            operator = 141 /* SyntaxKind.KeyOfKeyword */;
        }
        return ts.factory.createTypeOperatorNode(operator, type);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createTaggedTemplate` or the factory supplied by your transformation context instead. */
    ts.createTaggedTemplate = ts.Debug.deprecate(function createTaggedTemplate(tag, typeArgumentsOrTemplate, template) {
        var typeArguments;
        if (template) {
            typeArguments = typeArgumentsOrTemplate;
        }
        else {
            template = typeArgumentsOrTemplate;
        }
        return ts.factory.createTaggedTemplateExpression(tag, typeArguments, template);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateTaggedTemplate` or the factory supplied by your transformation context instead. */
    ts.updateTaggedTemplate = ts.Debug.deprecate(function updateTaggedTemplate(node, tag, typeArgumentsOrTemplate, template) {
        var typeArguments;
        if (template) {
            typeArguments = typeArgumentsOrTemplate;
        }
        else {
            template = typeArgumentsOrTemplate;
        }
        return ts.factory.updateTaggedTemplateExpression(node, tag, typeArguments, template);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateBinary` or the factory supplied by your transformation context instead. */
    ts.updateBinary = ts.Debug.deprecate(function updateBinary(node, left, right, operator) {
        if (operator === void 0) { operator = node.operatorToken; }
        if (typeof operator === "number") {
            operator = operator === node.operatorToken.kind ? node.operatorToken : ts.factory.createToken(operator);
        }
        return ts.factory.updateBinaryExpression(node, left, operator, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createConditional` or the factory supplied by your transformation context instead. */
    ts.createConditional = ts.Debug.deprecate(function createConditional(condition, questionTokenOrWhenTrue, whenTrueOrWhenFalse, colonToken, whenFalse) {
        return arguments.length === 5 ? ts.factory.createConditionalExpression(condition, questionTokenOrWhenTrue, whenTrueOrWhenFalse, colonToken, whenFalse) :
            arguments.length === 3 ? ts.factory.createConditionalExpression(condition, ts.factory.createToken(57 /* SyntaxKind.QuestionToken */), questionTokenOrWhenTrue, ts.factory.createToken(58 /* SyntaxKind.ColonToken */), whenTrueOrWhenFalse) :
                ts.Debug.fail("Argument count mismatch");
    }, factoryDeprecation);
    /** @deprecated Use `factory.createYield` or the factory supplied by your transformation context instead. */
    ts.createYield = ts.Debug.deprecate(function createYield(asteriskTokenOrExpression, expression) {
        var asteriskToken;
        if (expression) {
            asteriskToken = asteriskTokenOrExpression;
        }
        else {
            expression = asteriskTokenOrExpression;
        }
        return ts.factory.createYieldExpression(asteriskToken, expression);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createClassExpression` or the factory supplied by your transformation context instead. */
    ts.createClassExpression = ts.Debug.deprecate(function createClassExpression(modifiers, name, typeParameters, heritageClauses, members) {
        return ts.factory.createClassExpression(/*decorators*/ undefined, modifiers, name, typeParameters, heritageClauses, members);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateClassExpression` or the factory supplied by your transformation context instead. */
    ts.updateClassExpression = ts.Debug.deprecate(function updateClassExpression(node, modifiers, name, typeParameters, heritageClauses, members) {
        return ts.factory.updateClassExpression(node, /*decorators*/ undefined, modifiers, name, typeParameters, heritageClauses, members);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createPropertySignature` or the factory supplied by your transformation context instead. */
    ts.createPropertySignature = ts.Debug.deprecate(function createPropertySignature(modifiers, name, questionToken, type, initializer) {
        var node = ts.factory.createPropertySignature(modifiers, name, questionToken, type);
        node.initializer = initializer;
        return node;
    }, factoryDeprecation);
    /** @deprecated Use `factory.updatePropertySignature` or the factory supplied by your transformation context instead. */
    ts.updatePropertySignature = ts.Debug.deprecate(function updatePropertySignature(node, modifiers, name, questionToken, type, initializer) {
        var updated = ts.factory.updatePropertySignature(node, modifiers, name, questionToken, type);
        if (node.initializer !== initializer) {
            if (updated === node) {
                updated = ts.factory.cloneNode(node);
            }
            updated.initializer = initializer;
        }
        return updated;
    }, factoryDeprecation);
    /** @deprecated Use `factory.createExpressionWithTypeArguments` or the factory supplied by your transformation context instead. */
    ts.createExpressionWithTypeArguments = ts.Debug.deprecate(function createExpressionWithTypeArguments(typeArguments, expression) {
        return ts.factory.createExpressionWithTypeArguments(expression, typeArguments);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateExpressionWithTypeArguments` or the factory supplied by your transformation context instead. */
    ts.updateExpressionWithTypeArguments = ts.Debug.deprecate(function updateExpressionWithTypeArguments(node, typeArguments, expression) {
        return ts.factory.updateExpressionWithTypeArguments(node, expression, typeArguments);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createArrowFunction` or the factory supplied by your transformation context instead. */
    ts.createArrowFunction = ts.Debug.deprecate(function createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanTokenOrBody, body) {
        return arguments.length === 6 ? ts.factory.createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanTokenOrBody, body) :
            arguments.length === 5 ? ts.factory.createArrowFunction(modifiers, typeParameters, parameters, type, /*equalsGreaterThanToken*/ undefined, equalsGreaterThanTokenOrBody) :
                ts.Debug.fail("Argument count mismatch");
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateArrowFunction` or the factory supplied by your transformation context instead. */
    ts.updateArrowFunction = ts.Debug.deprecate(function updateArrowFunction(node, modifiers, typeParameters, parameters, type, equalsGreaterThanTokenOrBody, body) {
        return arguments.length === 7 ? ts.factory.updateArrowFunction(node, modifiers, typeParameters, parameters, type, equalsGreaterThanTokenOrBody, body) :
            arguments.length === 6 ? ts.factory.updateArrowFunction(node, modifiers, typeParameters, parameters, type, node.equalsGreaterThanToken, equalsGreaterThanTokenOrBody) :
                ts.Debug.fail("Argument count mismatch");
    }, factoryDeprecation);
    /** @deprecated Use `factory.createVariableDeclaration` or the factory supplied by your transformation context instead. */
    ts.createVariableDeclaration = ts.Debug.deprecate(function createVariableDeclaration(name, exclamationTokenOrType, typeOrInitializer, initializer) {
        return arguments.length === 4 ? ts.factory.createVariableDeclaration(name, exclamationTokenOrType, typeOrInitializer, initializer) :
            arguments.length >= 1 && arguments.length <= 3 ? ts.factory.createVariableDeclaration(name, /*exclamationToken*/ undefined, exclamationTokenOrType, typeOrInitializer) :
                ts.Debug.fail("Argument count mismatch");
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateVariableDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateVariableDeclaration = ts.Debug.deprecate(function updateVariableDeclaration(node, name, exclamationTokenOrType, typeOrInitializer, initializer) {
        return arguments.length === 5 ? ts.factory.updateVariableDeclaration(node, name, exclamationTokenOrType, typeOrInitializer, initializer) :
            arguments.length === 4 ? ts.factory.updateVariableDeclaration(node, name, node.exclamationToken, exclamationTokenOrType, typeOrInitializer) :
                ts.Debug.fail("Argument count mismatch");
    }, factoryDeprecation);
    /** @deprecated Use `factory.createImportClause` or the factory supplied by your transformation context instead. */
    ts.createImportClause = ts.Debug.deprecate(function createImportClause(name, namedBindings, isTypeOnly) {
        if (isTypeOnly === void 0) { isTypeOnly = false; }
        return ts.factory.createImportClause(isTypeOnly, name, namedBindings);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateImportClause` or the factory supplied by your transformation context instead. */
    ts.updateImportClause = ts.Debug.deprecate(function updateImportClause(node, name, namedBindings, isTypeOnly) {
        return ts.factory.updateImportClause(node, isTypeOnly, name, namedBindings);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createExportDeclaration` or the factory supplied by your transformation context instead. */
    ts.createExportDeclaration = ts.Debug.deprecate(function createExportDeclaration(decorators, modifiers, exportClause, moduleSpecifier, isTypeOnly) {
        if (isTypeOnly === void 0) { isTypeOnly = false; }
        return ts.factory.createExportDeclaration(decorators, modifiers, isTypeOnly, exportClause, moduleSpecifier);
    }, factoryDeprecation);
    /** @deprecated Use `factory.updateExportDeclaration` or the factory supplied by your transformation context instead. */
    ts.updateExportDeclaration = ts.Debug.deprecate(function updateExportDeclaration(node, decorators, modifiers, exportClause, moduleSpecifier, isTypeOnly) {
        return ts.factory.updateExportDeclaration(node, decorators, modifiers, isTypeOnly, exportClause, moduleSpecifier, node.assertClause);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createJSDocParameterTag` or the factory supplied by your transformation context instead. */
    ts.createJSDocParamTag = ts.Debug.deprecate(function createJSDocParamTag(name, isBracketed, typeExpression, comment) {
        return ts.factory.createJSDocParameterTag(/*tagName*/ undefined, name, isBracketed, typeExpression, /*isNameFirst*/ false, comment ? ts.factory.createNodeArray([ts.factory.createJSDocText(comment)]) : undefined);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createComma` or the factory supplied by your transformation context instead. */
    ts.createComma = ts.Debug.deprecate(function createComma(left, right) {
        return ts.factory.createComma(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createLessThan` or the factory supplied by your transformation context instead. */
    ts.createLessThan = ts.Debug.deprecate(function createLessThan(left, right) {
        return ts.factory.createLessThan(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createAssignment` or the factory supplied by your transformation context instead. */
    ts.createAssignment = ts.Debug.deprecate(function createAssignment(left, right) {
        return ts.factory.createAssignment(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createStrictEquality` or the factory supplied by your transformation context instead. */
    ts.createStrictEquality = ts.Debug.deprecate(function createStrictEquality(left, right) {
        return ts.factory.createStrictEquality(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createStrictInequality` or the factory supplied by your transformation context instead. */
    ts.createStrictInequality = ts.Debug.deprecate(function createStrictInequality(left, right) {
        return ts.factory.createStrictInequality(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createAdd` or the factory supplied by your transformation context instead. */
    ts.createAdd = ts.Debug.deprecate(function createAdd(left, right) {
        return ts.factory.createAdd(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createSubtract` or the factory supplied by your transformation context instead. */
    ts.createSubtract = ts.Debug.deprecate(function createSubtract(left, right) {
        return ts.factory.createSubtract(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createLogicalAnd` or the factory supplied by your transformation context instead. */
    ts.createLogicalAnd = ts.Debug.deprecate(function createLogicalAnd(left, right) {
        return ts.factory.createLogicalAnd(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createLogicalOr` or the factory supplied by your transformation context instead. */
    ts.createLogicalOr = ts.Debug.deprecate(function createLogicalOr(left, right) {
        return ts.factory.createLogicalOr(left, right);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createPostfixIncrement` or the factory supplied by your transformation context instead. */
    ts.createPostfixIncrement = ts.Debug.deprecate(function createPostfixIncrement(operand) {
        return ts.factory.createPostfixIncrement(operand);
    }, factoryDeprecation);
    /** @deprecated Use `factory.createLogicalNot` or the factory supplied by your transformation context instead. */
    ts.createLogicalNot = ts.Debug.deprecate(function createLogicalNot(operand) {
        return ts.factory.createLogicalNot(operand);
    }, factoryDeprecation);
    /** @deprecated Use an appropriate `factory` method instead. */
    ts.createNode = ts.Debug.deprecate(function createNode(kind, pos, end) {
        if (pos === void 0) { pos = 0; }
        if (end === void 0) { end = 0; }
        return ts.setTextRangePosEnd(kind === 308 /* SyntaxKind.SourceFile */ ? ts.parseBaseNodeFactory.createBaseSourceFileNode(kind) :
            kind === 79 /* SyntaxKind.Identifier */ ? ts.parseBaseNodeFactory.createBaseIdentifierNode(kind) :
                kind === 80 /* SyntaxKind.PrivateIdentifier */ ? ts.parseBaseNodeFactory.createBasePrivateIdentifierNode(kind) :
                    !ts.isNodeKind(kind) ? ts.parseBaseNodeFactory.createBaseTokenNode(kind) :
                        ts.parseBaseNodeFactory.createBaseNode(kind), pos, end);
    }, { since: "4.0", warnAfter: "4.1", message: "Use an appropriate `factory` method instead." });
    /**
     * Creates a shallow, memberwise clone of a node ~for mutation~ with its `pos`, `end`, and `parent` set.
     *
     * NOTE: It is unsafe to change any properties of a `Node` that relate to its AST children, as those changes won't be
     * captured with respect to transformations.
     *
     * @deprecated Use an appropriate `factory.update...` method instead, use `setCommentRange` or `setSourceMapRange`, and avoid setting `parent`.
     */
    ts.getMutableClone = ts.Debug.deprecate(function getMutableClone(node) {
        var clone = ts.factory.cloneNode(node);
        ts.setTextRange(clone, node);
        ts.setParent(clone, node.parent);
        return clone;
    }, { since: "4.0", warnAfter: "4.1", message: "Use an appropriate `factory.update...` method instead, use `setCommentRange` or `setSourceMapRange`, and avoid setting `parent`." });
})(ts || (ts = {}));
// DEPRECATION: Renamed node tests
// DEPRECATION PLAN:
//     - soft: 4.0
//     - warn: 4.1
//     - error: TBD
var ts;
(function (ts) {
    /** @deprecated Use `isTypeAssertionExpression` instead. */
    ts.isTypeAssertion = ts.Debug.deprecate(function isTypeAssertion(node) {
        return node.kind === 213 /* SyntaxKind.TypeAssertionExpression */;
    }, {
        since: "4.0",
        warnAfter: "4.1",
        message: "Use `isTypeAssertionExpression` instead."
    });
})(ts || (ts = {}));
// DEPRECATION: Renamed node tests
// DEPRECATION PLAN:
//     - soft: 4.2
//     - warn: 4.3
//     - error: 5.0
var ts;
(function (ts) {
    /**
     * @deprecated Use `isMemberName` instead.
     */
    ts.isIdentifierOrPrivateIdentifier = ts.Debug.deprecate(function isIdentifierOrPrivateIdentifier(node) {
        return ts.isMemberName(node);
    }, {
        since: "4.2",
        warnAfter: "4.3",
        message: "Use `isMemberName` instead."
    });
})(ts || (ts = {}));
// DEPRECATION: Overloads for createConstructorTypeNode/updateConstructorTypeNode that do not accept 'modifiers'
// DEPRECATION PLAN:
//     - soft: 4.2
//     - warn: 4.3
//     - error: 5.0
var ts;
(function (ts) {
    function patchNodeFactory(factory) {
        var createConstructorTypeNode = factory.createConstructorTypeNode, updateConstructorTypeNode = factory.updateConstructorTypeNode;
        factory.createConstructorTypeNode = ts.buildOverload("createConstructorTypeNode")
            .overload({
            0: function (modifiers, typeParameters, parameters, type) {
                return createConstructorTypeNode(modifiers, typeParameters, parameters, type);
            },
            1: function (typeParameters, parameters, type) {
                return createConstructorTypeNode(/*modifiers*/ undefined, typeParameters, parameters, type);
            },
        })
            .bind({
            0: function (args) { return args.length === 4; },
            1: function (args) { return args.length === 3; },
        })
            .deprecate({
            1: { since: "4.2", warnAfter: "4.3", message: "Use the overload that accepts 'modifiers'" }
        })
            .finish();
        factory.updateConstructorTypeNode = ts.buildOverload("updateConstructorTypeNode")
            .overload({
            0: function (node, modifiers, typeParameters, parameters, type) {
                return updateConstructorTypeNode(node, modifiers, typeParameters, parameters, type);
            },
            1: function (node, typeParameters, parameters, type) {
                return updateConstructorTypeNode(node, node.modifiers, typeParameters, parameters, type);
            }
        })
            .bind({
            0: function (args) { return args.length === 5; },
            1: function (args) { return args.length === 4; },
        })
            .deprecate({
            1: { since: "4.2", warnAfter: "4.3", message: "Use the overload that accepts 'modifiers'" }
        })
            .finish();
    }
    // Patch `createNodeFactory` because it creates the factories that are provided to transformers
    // in the public API.
    var prevCreateNodeFactory = ts.createNodeFactory;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
    ts.createNodeFactory = function (flags, baseFactory) {
        var factory = prevCreateNodeFactory(flags, baseFactory);
        patchNodeFactory(factory);
        return factory;
    };
    // Patch `ts.factory` because its public
    patchNodeFactory(ts.factory);
})(ts || (ts = {}));
// DEPRECATION: Overloads to createImportTypeNode/updateImportTypeNode that do not accept `assertions`
// DEPRECATION PLAN:
//     - soft: 4.6
//     - warn: 4.7
//     - error: 5.0
var ts;
(function (ts) {
    function patchNodeFactory(factory) {
        var createImportTypeNode = factory.createImportTypeNode, updateImportTypeNode = factory.updateImportTypeNode;
        factory.createImportTypeNode = ts.buildOverload("createImportTypeNode")
            .overload({
            0: function (argument, assertions, qualifier, typeArguments, isTypeOf) {
                return createImportTypeNode(argument, assertions, qualifier, typeArguments, isTypeOf);
            },
            1: function (argument, qualifier, typeArguments, isTypeOf) {
                return createImportTypeNode(argument, /*assertions*/ undefined, qualifier, typeArguments, isTypeOf);
            },
        })
            .bind({
            0: function (_a) {
                var assertions = _a[1], qualifier = _a[2], typeArguments = _a[3], isTypeOf = _a[4];
                return (assertions === undefined || ts.isImportTypeAssertionContainer(assertions)) &&
                    (qualifier === undefined || !ts.isArray(qualifier)) &&
                    (typeArguments === undefined || ts.isArray(typeArguments)) &&
                    (isTypeOf === undefined || typeof isTypeOf === "boolean");
            },
            1: function (_a) {
                var qualifier = _a[1], typeArguments = _a[2], isTypeOf = _a[3], other = _a[4];
                return (other === undefined) &&
                    (qualifier === undefined || ts.isEntityName(qualifier)) &&
                    (typeArguments === undefined || ts.isArray(typeArguments)) &&
                    (isTypeOf === undefined || typeof isTypeOf === "boolean");
            },
        })
            .deprecate({
            1: { since: "4.6", warnAfter: "4.7", message: "Use the overload that accepts 'assertions'" }
        })
            .finish();
        factory.updateImportTypeNode = ts.buildOverload("updateImportTypeNode")
            .overload({
            0: function (node, argument, assertions, qualifier, typeArguments, isTypeOf) {
                return updateImportTypeNode(node, argument, assertions, qualifier, typeArguments, isTypeOf);
            },
            1: function (node, argument, qualifier, typeArguments, isTypeOf) {
                return updateImportTypeNode(node, argument, node.assertions, qualifier, typeArguments, isTypeOf);
            },
        })
            .bind({
            0: function (_a) {
                var assertions = _a[2], qualifier = _a[3], typeArguments = _a[4], isTypeOf = _a[5];
                return (assertions === undefined || ts.isImportTypeAssertionContainer(assertions)) &&
                    (qualifier === undefined || !ts.isArray(qualifier)) &&
                    (typeArguments === undefined || ts.isArray(typeArguments)) &&
                    (isTypeOf === undefined || typeof isTypeOf === "boolean");
            },
            1: function (_a) {
                var qualifier = _a[2], typeArguments = _a[3], isTypeOf = _a[4], other = _a[5];
                return (other === undefined) &&
                    (qualifier === undefined || ts.isEntityName(qualifier)) &&
                    (typeArguments === undefined || ts.isArray(typeArguments)) &&
                    (isTypeOf === undefined || typeof isTypeOf === "boolean");
            },
        }).
            deprecate({
            1: { since: "4.6", warnAfter: "4.7", message: "Use the overload that accepts 'assertions'" }
        })
            .finish();
    }
    // Patch `createNodeFactory` because it creates the factories that are provided to transformers
    // in the public API.
    var prevCreateNodeFactory = ts.createNodeFactory;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
    ts.createNodeFactory = function (flags, baseFactory) {
        var factory = prevCreateNodeFactory(flags, baseFactory);
        patchNodeFactory(factory);
        return factory;
    };
    // Patch `ts.factory` because its public
    patchNodeFactory(ts.factory);
})(ts || (ts = {}));
// DEPRECATION: Overloads to createTypeParameter/updateTypeParameter that does not accept `modifiers`
// DEPRECATION PLAN:
//     - soft: 4.7
//     - warn: 4.8
//     - error: 5.0
var ts;
(function (ts) {
    function patchNodeFactory(factory) {
        var createTypeParameterDeclaration = factory.createTypeParameterDeclaration, updateTypeParameterDeclaration = factory.updateTypeParameterDeclaration;
        factory.createTypeParameterDeclaration = ts.buildOverload("createTypeParameterDeclaration")
            .overload({
            0: function (modifiers, name, constraint, defaultType) {
                return createTypeParameterDeclaration(modifiers, name, constraint, defaultType);
            },
            1: function (name, constraint, defaultType) {
                return createTypeParameterDeclaration(/*modifiers*/ undefined, name, constraint, defaultType);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0];
                return (modifiers === undefined || ts.isArray(modifiers));
            },
            1: function (_a) {
                var name = _a[0];
                return (name !== undefined && !ts.isArray(name));
            },
        })
            .deprecate({
            1: { since: "4.7", warnAfter: "4.8", message: "Use the overload that accepts 'modifiers'" }
        })
            .finish();
        factory.updateTypeParameterDeclaration = ts.buildOverload("updateTypeParameterDeclaration")
            .overload({
            0: function (node, modifiers, name, constraint, defaultType) {
                return updateTypeParameterDeclaration(node, modifiers, name, constraint, defaultType);
            },
            1: function (node, name, constraint, defaultType) {
                return updateTypeParameterDeclaration(node, node.modifiers, name, constraint, defaultType);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1];
                return (modifiers === undefined || ts.isArray(modifiers));
            },
            1: function (_a) {
                var name = _a[1];
                return (name !== undefined && !ts.isArray(name));
            },
        })
            .deprecate({
            1: { since: "4.7", warnAfter: "4.8", message: "Use the overload that accepts 'modifiers'" }
        })
            .finish();
    }
    // Patch `createNodeFactory` because it creates the factories that are provided to transformers
    // in the public API.
    var prevCreateNodeFactory = ts.createNodeFactory;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
    ts.createNodeFactory = function (flags, baseFactory) {
        var factory = prevCreateNodeFactory(flags, baseFactory);
        patchNodeFactory(factory);
        return factory;
    };
    // Patch `ts.factory` because its public
    patchNodeFactory(ts.factory);
})(ts || (ts = {}));
// DEPRECATION: Deprecate passing `decorators` separate from `modifiers`
// DEPRECATION PLAN:
//     - soft: 4.8
//     - warn: 4.9
//     - error: 5.0
var ts;
(function (ts) {
    var MUST_MERGE = { since: "4.8", warnAfter: "4.9.0-0", message: "Decorators have been combined with modifiers. Callers should switch to an overload that does not accept a 'decorators' parameter." };
    var DISALLOW_DECORATORS = { since: "4.8", warnAfter: "4.9.0-0", message: "Decorators are no longer supported for this function. Callers should switch to an overload that does not accept a 'decorators' parameter." };
    var DISALLOW_DECORATORS_AND_MODIFIERS = { since: "4.8", warnAfter: "4.9.0-0", message: "Decorators and modifiers are no longer supported for this function. Callers should switch to an overload that does not accept the 'decorators' and 'modifiers' parameters." };
    function patchNodeFactory(factory) {
        var createParameterDeclaration = factory.createParameterDeclaration, updateParameterDeclaration = factory.updateParameterDeclaration, createPropertyDeclaration = factory.createPropertyDeclaration, updatePropertyDeclaration = factory.updatePropertyDeclaration, createMethodDeclaration = factory.createMethodDeclaration, updateMethodDeclaration = factory.updateMethodDeclaration, createConstructorDeclaration = factory.createConstructorDeclaration, updateConstructorDeclaration = factory.updateConstructorDeclaration, createGetAccessorDeclaration = factory.createGetAccessorDeclaration, updateGetAccessorDeclaration = factory.updateGetAccessorDeclaration, createSetAccessorDeclaration = factory.createSetAccessorDeclaration, updateSetAccessorDeclaration = factory.updateSetAccessorDeclaration, createIndexSignature = factory.createIndexSignature, updateIndexSignature = factory.updateIndexSignature, createClassStaticBlockDeclaration = factory.createClassStaticBlockDeclaration, updateClassStaticBlockDeclaration = factory.updateClassStaticBlockDeclaration, createClassExpression = factory.createClassExpression, updateClassExpression = factory.updateClassExpression, createFunctionDeclaration = factory.createFunctionDeclaration, updateFunctionDeclaration = factory.updateFunctionDeclaration, createClassDeclaration = factory.createClassDeclaration, updateClassDeclaration = factory.updateClassDeclaration, createInterfaceDeclaration = factory.createInterfaceDeclaration, updateInterfaceDeclaration = factory.updateInterfaceDeclaration, createTypeAliasDeclaration = factory.createTypeAliasDeclaration, updateTypeAliasDeclaration = factory.updateTypeAliasDeclaration, createEnumDeclaration = factory.createEnumDeclaration, updateEnumDeclaration = factory.updateEnumDeclaration, createModuleDeclaration = factory.createModuleDeclaration, updateModuleDeclaration = factory.updateModuleDeclaration, createImportEqualsDeclaration = factory.createImportEqualsDeclaration, updateImportEqualsDeclaration = factory.updateImportEqualsDeclaration, createImportDeclaration = factory.createImportDeclaration, updateImportDeclaration = factory.updateImportDeclaration, createExportAssignment = factory.createExportAssignment, updateExportAssignment = factory.updateExportAssignment, createExportDeclaration = factory.createExportDeclaration, updateExportDeclaration = factory.updateExportDeclaration;
        factory.createParameterDeclaration = ts.buildOverload("createParameterDeclaration")
            .overload({
            0: function (modifiers, dotDotDotToken, name, questionToken, type, initializer) {
                return createParameterDeclaration(modifiers, dotDotDotToken, name, questionToken, type, initializer);
            },
            1: function (decorators, modifiers, dotDotDotToken, name, questionToken, type, initializer) {
                return createParameterDeclaration(ts.concatenate(decorators, modifiers), dotDotDotToken, name, questionToken, type, initializer);
            },
        })
            .bind({
            0: function (_a) {
                var dotDotDotToken = _a[1], name = _a[2], questionToken = _a[3], type = _a[4], initializer = _a[5], other = _a[6];
                return (other === undefined) &&
                    (dotDotDotToken === undefined || !ts.isArray(dotDotDotToken)) &&
                    (name === undefined || typeof name === "string" || ts.isBindingName(name)) &&
                    (questionToken === undefined || typeof questionToken === "object" && ts.isQuestionToken(questionToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
            1: function (_a) {
                var modifiers = _a[1], dotDotDotToken = _a[2], name = _a[3], questionToken = _a[4], type = _a[5], initializer = _a[6];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (dotDotDotToken === undefined || typeof dotDotDotToken === "object" && ts.isDotDotDotToken(dotDotDotToken)) &&
                    (name === undefined || typeof name === "string" || ts.isBindingName(name)) &&
                    (questionToken === undefined || ts.isQuestionToken(questionToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.updateParameterDeclaration = ts.buildOverload("updateParameterDeclaration")
            .overload({
            0: function (node, modifiers, dotDotDotToken, name, questionToken, type, initializer) {
                return updateParameterDeclaration(node, modifiers, dotDotDotToken, name, questionToken, type, initializer);
            },
            1: function (node, decorators, modifiers, dotDotDotToken, name, questionToken, type, initializer) {
                return updateParameterDeclaration(node, ts.concatenate(decorators, modifiers), dotDotDotToken, name, questionToken, type, initializer);
            },
        })
            .bind({
            0: function (_a) {
                var dotDotDotToken = _a[2], name = _a[3], questionToken = _a[4], type = _a[5], initializer = _a[6], other = _a[7];
                return (other === undefined) &&
                    (dotDotDotToken === undefined || !ts.isArray(dotDotDotToken)) &&
                    (name === undefined || typeof name === "string" || ts.isBindingName(name)) &&
                    (questionToken === undefined || typeof questionToken === "object" && ts.isQuestionToken(questionToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
            1: function (_a) {
                var modifiers = _a[2], dotDotDotToken = _a[3], name = _a[4], questionToken = _a[5], type = _a[6], initializer = _a[7];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (dotDotDotToken === undefined || typeof dotDotDotToken === "object" && ts.isDotDotDotToken(dotDotDotToken)) &&
                    (name === undefined || typeof name === "string" || ts.isBindingName(name)) &&
                    (questionToken === undefined || ts.isQuestionToken(questionToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.createPropertyDeclaration = ts.buildOverload("createPropertyDeclaration")
            .overload({
            0: function (modifiers, name, questionOrExclamationToken, type, initializer) {
                return createPropertyDeclaration(modifiers, name, questionOrExclamationToken, type, initializer);
            },
            1: function (decorators, modifiers, name, questionOrExclamationToken, type, initializer) {
                return createPropertyDeclaration(ts.concatenate(decorators, modifiers), name, questionOrExclamationToken, type, initializer);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[1], questionOrExclamationToken = _a[2], type = _a[3], initializer = _a[4], other = _a[5];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (questionOrExclamationToken === undefined || typeof questionOrExclamationToken === "object" && ts.isQuestionOrExclamationToken(questionOrExclamationToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
            1: function (_a) {
                var modifiers = _a[1], name = _a[2], questionOrExclamationToken = _a[3], type = _a[4], initializer = _a[5];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || typeof name === "string" || ts.isPropertyName(name)) &&
                    (questionOrExclamationToken === undefined || ts.isQuestionOrExclamationToken(questionOrExclamationToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.updatePropertyDeclaration = ts.buildOverload("updatePropertyDeclaration")
            .overload({
            0: function (node, modifiers, name, questionOrExclamationToken, type, initializer) {
                return updatePropertyDeclaration(node, modifiers, name, questionOrExclamationToken, type, initializer);
            },
            1: function (node, decorators, modifiers, name, questionOrExclamationToken, type, initializer) {
                return updatePropertyDeclaration(node, ts.concatenate(decorators, modifiers), name, questionOrExclamationToken, type, initializer);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[2], questionOrExclamationToken = _a[3], type = _a[4], initializer = _a[5], other = _a[6];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (questionOrExclamationToken === undefined || typeof questionOrExclamationToken === "object" && ts.isQuestionOrExclamationToken(questionOrExclamationToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
            1: function (_a) {
                var modifiers = _a[2], name = _a[3], questionOrExclamationToken = _a[4], type = _a[5], initializer = _a[6];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || typeof name === "string" || ts.isPropertyName(name)) &&
                    (questionOrExclamationToken === undefined || ts.isQuestionOrExclamationToken(questionOrExclamationToken)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (initializer === undefined || ts.isExpression(initializer));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.createMethodDeclaration = ts.buildOverload("createMethodDeclaration")
            .overload({
            0: function (modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body) {
                return createMethodDeclaration(modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body);
            },
            1: function (decorators, modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body) {
                return createMethodDeclaration(ts.concatenate(decorators, modifiers), asteriskToken, name, questionToken, typeParameters, parameters, type, body);
            },
        })
            .bind({
            0: function (_a) {
                var asteriskToken = _a[1], name = _a[2], questionToken = _a[3], typeParameters = _a[4], parameters = _a[5], type = _a[6], body = _a[7], other = _a[8];
                return (other === undefined) &&
                    (asteriskToken === undefined || !ts.isArray(asteriskToken)) &&
                    (name === undefined || typeof name === "string" || ts.isPropertyName(name)) &&
                    (questionToken === undefined || typeof questionToken === "object" && ts.isQuestionToken(questionToken)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (parameters === undefined || !ts.some(parameters, ts.isTypeParameterDeclaration)) &&
                    (type === undefined || !ts.isArray(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
            1: function (_a) {
                var modifiers = _a[1], asteriskToken = _a[2], name = _a[3], questionToken = _a[4], typeParameters = _a[5], parameters = _a[6], type = _a[7], body = _a[8];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (asteriskToken === undefined || typeof asteriskToken === "object" && ts.isAsteriskToken(asteriskToken)) &&
                    (name === undefined || typeof name === "string" || ts.isPropertyName(name)) &&
                    (questionToken === undefined || !ts.isArray(questionToken)) &&
                    (typeParameters === undefined || !ts.some(typeParameters, ts.isParameter)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.updateMethodDeclaration = ts.buildOverload("updateMethodDeclaration")
            .overload({
            0: function (node, modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body) {
                return updateMethodDeclaration(node, modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body);
            },
            1: function (node, decorators, modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body) {
                return updateMethodDeclaration(node, ts.concatenate(decorators, modifiers), asteriskToken, name, questionToken, typeParameters, parameters, type, body);
            },
        })
            .bind({
            0: function (_a) {
                var asteriskToken = _a[2], name = _a[3], questionToken = _a[4], typeParameters = _a[5], parameters = _a[6], type = _a[7], body = _a[8], other = _a[9];
                return (other === undefined) &&
                    (asteriskToken === undefined || !ts.isArray(asteriskToken)) &&
                    (name === undefined || typeof name === "string" || ts.isPropertyName(name)) &&
                    (questionToken === undefined || typeof questionToken === "object" && ts.isQuestionToken(questionToken)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (parameters === undefined || !ts.some(parameters, ts.isTypeParameterDeclaration)) &&
                    (type === undefined || !ts.isArray(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
            1: function (_a) {
                var modifiers = _a[2], asteriskToken = _a[3], name = _a[4], questionToken = _a[5], typeParameters = _a[6], parameters = _a[7], type = _a[8], body = _a[9];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (asteriskToken === undefined || typeof asteriskToken === "object" && ts.isAsteriskToken(asteriskToken)) &&
                    (name === undefined || typeof name === "string" || ts.isPropertyName(name)) &&
                    (questionToken === undefined || !ts.isArray(questionToken)) &&
                    (typeParameters === undefined || !ts.some(typeParameters, ts.isParameter)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.createConstructorDeclaration = ts.buildOverload("createConstructorDeclaration")
            .overload({
            0: function (modifiers, parameters, body) {
                return createConstructorDeclaration(modifiers, parameters, body);
            },
            1: function (_decorators, modifiers, parameters, body) {
                return createConstructorDeclaration(modifiers, parameters, body);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], parameters = _a[1], body = _a[2], other = _a[3];
                return (other === undefined) &&
                    (modifiers === undefined || !ts.some(modifiers, ts.isDecorator)) &&
                    (parameters === undefined || !ts.some(parameters, ts.isModifier)) &&
                    (body === undefined || !ts.isArray(body));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], parameters = _a[2], body = _a[3];
                return (decorators === undefined || !ts.some(decorators, ts.isModifier)) &&
                    (modifiers === undefined || !ts.some(modifiers, ts.isParameter)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateConstructorDeclaration = ts.buildOverload("updateConstructorDeclaration")
            .overload({
            0: function (node, modifiers, parameters, body) {
                return updateConstructorDeclaration(node, modifiers, parameters, body);
            },
            1: function (node, _decorators, modifiers, parameters, body) {
                return updateConstructorDeclaration(node, modifiers, parameters, body);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], parameters = _a[2], body = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || !ts.some(modifiers, ts.isDecorator)) &&
                    (parameters === undefined || !ts.some(parameters, ts.isModifier)) &&
                    (body === undefined || !ts.isArray(body));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], parameters = _a[3], body = _a[4];
                return (decorators === undefined || !ts.some(decorators, ts.isModifier)) &&
                    (modifiers === undefined || !ts.some(modifiers, ts.isParameter)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createGetAccessorDeclaration = ts.buildOverload("createGetAccessorDeclaration")
            .overload({
            0: function (modifiers, name, parameters, type, body) {
                return createGetAccessorDeclaration(modifiers, name, parameters, type, body);
            },
            1: function (decorators, modifiers, name, parameters, type, body) {
                return createGetAccessorDeclaration(ts.concatenate(decorators, modifiers), name, parameters, type, body);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[1], parameters = _a[2], type = _a[3], body = _a[4], other = _a[5];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || !ts.isArray(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
            1: function (_a) {
                var modifiers = _a[1], name = _a[2], parameters = _a[3], type = _a[4], body = _a[5];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.updateGetAccessorDeclaration = ts.buildOverload("updateGetAccessorDeclaration")
            .overload({
            0: function (node, modifiers, name, parameters, type, body) {
                return updateGetAccessorDeclaration(node, modifiers, name, parameters, type, body);
            },
            1: function (node, decorators, modifiers, name, parameters, type, body) {
                return updateGetAccessorDeclaration(node, ts.concatenate(decorators, modifiers), name, parameters, type, body);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[2], parameters = _a[3], type = _a[4], body = _a[5], other = _a[6];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || !ts.isArray(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
            1: function (_a) {
                var modifiers = _a[2], name = _a[3], parameters = _a[4], type = _a[5], body = _a[6];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.createSetAccessorDeclaration = ts.buildOverload("createSetAccessorDeclaration")
            .overload({
            0: function (modifiers, name, parameters, body) {
                return createSetAccessorDeclaration(modifiers, name, parameters, body);
            },
            1: function (decorators, modifiers, name, parameters, body) {
                return createSetAccessorDeclaration(ts.concatenate(decorators, modifiers), name, parameters, body);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[1], parameters = _a[2], body = _a[3], other = _a[4];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (body === undefined || !ts.isArray(body));
            },
            1: function (_a) {
                var modifiers = _a[1], name = _a[2], parameters = _a[3], body = _a[4];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.updateSetAccessorDeclaration = ts.buildOverload("updateSetAccessorDeclaration")
            .overload({
            0: function (node, modifiers, name, parameters, body) {
                return updateSetAccessorDeclaration(node, modifiers, name, parameters, body);
            },
            1: function (node, decorators, modifiers, name, parameters, body) {
                return updateSetAccessorDeclaration(node, ts.concatenate(decorators, modifiers), name, parameters, body);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[2], parameters = _a[3], body = _a[4], other = _a[5];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (body === undefined || !ts.isArray(body));
            },
            1: function (_a) {
                var modifiers = _a[2], name = _a[3], parameters = _a[4], body = _a[5];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.createIndexSignature = ts.buildOverload("createIndexSignature")
            .overload({
            0: function (modifiers, parameters, type) {
                return createIndexSignature(modifiers, parameters, type);
            },
            1: function (_decorators, modifiers, parameters, type) {
                return createIndexSignature(modifiers, parameters, type);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], parameters = _a[1], type = _a[2], other = _a[3];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (parameters === undefined || ts.every(parameters, ts.isParameter)) &&
                    (type === undefined || !ts.isArray(type));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], parameters = _a[2], type = _a[3];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateIndexSignature = ts.buildOverload("updateIndexSignature")
            .overload({
            0: function (node, modifiers, parameters, type) {
                return updateIndexSignature(node, modifiers, parameters, type);
            },
            1: function (node, _decorators, modifiers, parameters, type) {
                return updateIndexSignature(node, modifiers, parameters, type);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], parameters = _a[2], type = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (parameters === undefined || ts.every(parameters, ts.isParameter)) &&
                    (type === undefined || !ts.isArray(type));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], parameters = _a[3], type = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createClassStaticBlockDeclaration = ts.buildOverload("createClassStaticBlockDeclaration")
            .overload({
            0: function (body) {
                return createClassStaticBlockDeclaration(body);
            },
            1: function (_decorators, _modifiers, body) {
                return createClassStaticBlockDeclaration(body);
            },
        })
            .bind({
            0: function (_a) {
                var body = _a[0], other1 = _a[1], other2 = _a[2];
                return (other1 === undefined) &&
                    (other2 === undefined) &&
                    (body === undefined || !ts.isArray(body));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], body = _a[2];
                return (decorators === undefined || ts.isArray(decorators)) &&
                    (modifiers === undefined || ts.isArray(decorators)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS_AND_MODIFIERS
        })
            .finish();
        factory.updateClassStaticBlockDeclaration = ts.buildOverload("updateClassStaticBlockDeclaration")
            .overload({
            0: function (node, body) {
                return updateClassStaticBlockDeclaration(node, body);
            },
            1: function (node, _decorators, _modifiers, body) {
                return updateClassStaticBlockDeclaration(node, body);
            },
        })
            .bind({
            0: function (_a) {
                var body = _a[1], other1 = _a[2], other2 = _a[3];
                return (other1 === undefined) &&
                    (other2 === undefined) &&
                    (body === undefined || !ts.isArray(body));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], body = _a[3];
                return (decorators === undefined || ts.isArray(decorators)) &&
                    (modifiers === undefined || ts.isArray(decorators)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS_AND_MODIFIERS
        })
            .finish();
        factory.createClassExpression = ts.buildOverload("createClassExpression")
            .overload({
            0: function (modifiers, name, typeParameters, heritageClauses, members) {
                return createClassExpression(modifiers, name, typeParameters, heritageClauses, members);
            },
            1: function (decorators, modifiers, name, typeParameters, heritageClauses, members) {
                return createClassExpression(ts.concatenate(decorators, modifiers), name, typeParameters, heritageClauses, members);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[1], typeParameters = _a[2], heritageClauses = _a[3], members = _a[4], other = _a[5];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isClassElement));
            },
            1: function (_a) {
                var modifiers = _a[1], name = _a[2], typeParameters = _a[3], heritageClauses = _a[4], members = _a[5];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.isArray(members));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateClassExpression = ts.buildOverload("updateClassExpression")
            .overload({
            0: function (node, modifiers, name, typeParameters, heritageClauses, members) {
                return updateClassExpression(node, modifiers, name, typeParameters, heritageClauses, members);
            },
            1: function (node, decorators, modifiers, name, typeParameters, heritageClauses, members) {
                return updateClassExpression(node, ts.concatenate(decorators, modifiers), name, typeParameters, heritageClauses, members);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[2], typeParameters = _a[3], heritageClauses = _a[4], members = _a[5], other = _a[6];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isClassElement));
            },
            1: function (_a) {
                var modifiers = _a[2], name = _a[3], typeParameters = _a[4], heritageClauses = _a[5], members = _a[6];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.isArray(members));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createFunctionDeclaration = ts.buildOverload("createFunctionDeclaration")
            .overload({
            0: function (modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
                return createFunctionDeclaration(modifiers, asteriskToken, name, typeParameters, parameters, type, body);
            },
            1: function (_decorators, modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
                return createFunctionDeclaration(modifiers, asteriskToken, name, typeParameters, parameters, type, body);
            },
        })
            .bind({
            0: function (_a) {
                var asteriskToken = _a[1], name = _a[2], typeParameters = _a[3], parameters = _a[4], type = _a[5], body = _a[6], other = _a[7];
                return (other === undefined) &&
                    (asteriskToken === undefined || !ts.isArray(asteriskToken)) &&
                    (name === undefined || typeof name === "string" || ts.isIdentifier(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (parameters === undefined || ts.every(parameters, ts.isParameter)) &&
                    (type === undefined || !ts.isArray(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
            1: function (_a) {
                var modifiers = _a[1], asteriskToken = _a[2], name = _a[3], typeParameters = _a[4], parameters = _a[5], type = _a[6], body = _a[7];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (asteriskToken === undefined || typeof asteriskToken !== "string" && ts.isAsteriskToken(asteriskToken)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateFunctionDeclaration = ts.buildOverload("updateFunctionDeclaration")
            .overload({
            0: function (node, modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
                return updateFunctionDeclaration(node, modifiers, asteriskToken, name, typeParameters, parameters, type, body);
            },
            1: function (node, _decorators, modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
                return updateFunctionDeclaration(node, modifiers, asteriskToken, name, typeParameters, parameters, type, body);
            },
        })
            .bind({
            0: function (_a) {
                var asteriskToken = _a[2], name = _a[3], typeParameters = _a[4], parameters = _a[5], type = _a[6], body = _a[7], other = _a[8];
                return (other === undefined) &&
                    (asteriskToken === undefined || !ts.isArray(asteriskToken)) &&
                    (name === undefined || ts.isIdentifier(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (parameters === undefined || ts.every(parameters, ts.isParameter)) &&
                    (type === undefined || !ts.isArray(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
            1: function (_a) {
                var modifiers = _a[2], asteriskToken = _a[3], name = _a[4], typeParameters = _a[5], parameters = _a[6], type = _a[7], body = _a[8];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (asteriskToken === undefined || typeof asteriskToken !== "string" && ts.isAsteriskToken(asteriskToken)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (parameters === undefined || ts.isArray(parameters)) &&
                    (type === undefined || ts.isTypeNode(type)) &&
                    (body === undefined || ts.isBlock(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createClassDeclaration = ts.buildOverload("createClassDeclaration")
            .overload({
            0: function (modifiers, name, typeParameters, heritageClauses, members) {
                return createClassDeclaration(modifiers, name, typeParameters, heritageClauses, members);
            },
            1: function (decorators, modifiers, name, typeParameters, heritageClauses, members) {
                return createClassDeclaration(ts.concatenate(decorators, modifiers), name, typeParameters, heritageClauses, members);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[1], typeParameters = _a[2], heritageClauses = _a[3], members = _a[4], other = _a[5];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isClassElement));
            },
            1: function () { return true; },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.updateClassDeclaration = ts.buildOverload("updateClassDeclaration")
            .overload({
            0: function (node, modifiers, name, typeParameters, heritageClauses, members) {
                return updateClassDeclaration(node, modifiers, name, typeParameters, heritageClauses, members);
            },
            1: function (node, decorators, modifiers, name, typeParameters, heritageClauses, members) {
                return updateClassDeclaration(node, ts.concatenate(decorators, modifiers), name, typeParameters, heritageClauses, members);
            },
        })
            .bind({
            0: function (_a) {
                var name = _a[2], typeParameters = _a[3], heritageClauses = _a[4], members = _a[5], other = _a[6];
                return (other === undefined) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isClassElement));
            },
            1: function (_a) {
                var modifiers = _a[2], name = _a[3], typeParameters = _a[4], heritageClauses = _a[5], members = _a[6];
                return (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.isArray(members));
            },
        })
            .deprecate({
            1: MUST_MERGE
        })
            .finish();
        factory.createInterfaceDeclaration = ts.buildOverload("createInterfaceDeclaration")
            .overload({
            0: function (modifiers, name, typeParameters, heritageClauses, members) {
                return createInterfaceDeclaration(modifiers, name, typeParameters, heritageClauses, members);
            },
            1: function (_decorators, modifiers, name, typeParameters, heritageClauses, members) {
                return createInterfaceDeclaration(modifiers, name, typeParameters, heritageClauses, members);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], name = _a[1], typeParameters = _a[2], heritageClauses = _a[3], members = _a[4], other = _a[5];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isTypeElement));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], name = _a[2], typeParameters = _a[3], heritageClauses = _a[4], members = _a[5];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isTypeElement));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateInterfaceDeclaration = ts.buildOverload("updateInterfaceDeclaration")
            .overload({
            0: function (node, modifiers, name, typeParameters, heritageClauses, members) {
                return updateInterfaceDeclaration(node, modifiers, name, typeParameters, heritageClauses, members);
            },
            1: function (node, _decorators, modifiers, name, typeParameters, heritageClauses, members) {
                return updateInterfaceDeclaration(node, modifiers, name, typeParameters, heritageClauses, members);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], name = _a[2], typeParameters = _a[3], heritageClauses = _a[4], members = _a[5], other = _a[6];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isTypeElement));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], name = _a[3], typeParameters = _a[4], heritageClauses = _a[5], members = _a[6];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.every(typeParameters, ts.isTypeParameterDeclaration)) &&
                    (heritageClauses === undefined || ts.every(heritageClauses, ts.isHeritageClause)) &&
                    (members === undefined || ts.every(members, ts.isTypeElement));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createTypeAliasDeclaration = ts.buildOverload("createTypeAliasDeclaration")
            .overload({
            0: function (modifiers, name, typeParameters, type) {
                return createTypeAliasDeclaration(modifiers, name, typeParameters, type);
            },
            1: function (_decorators, modifiers, name, typeParameters, type) {
                return createTypeAliasDeclaration(modifiers, name, typeParameters, type);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], name = _a[1], typeParameters = _a[2], type = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (type === undefined || !ts.isArray(type));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], name = _a[2], typeParameters = _a[3], type = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (type === undefined || ts.isTypeNode(type));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateTypeAliasDeclaration = ts.buildOverload("updateTypeAliasDeclaration")
            .overload({
            0: function (node, modifiers, name, typeParameters, type) {
                return updateTypeAliasDeclaration(node, modifiers, name, typeParameters, type);
            },
            1: function (node, _decorators, modifiers, name, typeParameters, type) {
                return updateTypeAliasDeclaration(node, modifiers, name, typeParameters, type);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], name = _a[2], typeParameters = _a[3], type = _a[4], other = _a[5];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (type === undefined || !ts.isArray(type));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], name = _a[3], typeParameters = _a[4], type = _a[5];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (typeParameters === undefined || ts.isArray(typeParameters)) &&
                    (type === undefined || ts.isTypeNode(type));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createEnumDeclaration = ts.buildOverload("createEnumDeclaration")
            .overload({
            0: function (modifiers, name, members) {
                return createEnumDeclaration(modifiers, name, members);
            },
            1: function (_decorators, modifiers, name, members) {
                return createEnumDeclaration(modifiers, name, members);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], name = _a[1], members = _a[2], other = _a[3];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (members === undefined || ts.isArray(members));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], name = _a[2], members = _a[3];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (members === undefined || ts.isArray(members));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateEnumDeclaration = ts.buildOverload("updateEnumDeclaration")
            .overload({
            0: function (node, modifiers, name, members) {
                return updateEnumDeclaration(node, modifiers, name, members);
            },
            1: function (node, _decorators, modifiers, name, members) {
                return updateEnumDeclaration(node, modifiers, name, members);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], name = _a[2], members = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (members === undefined || ts.isArray(members));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], name = _a[3], members = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (members === undefined || ts.isArray(members));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createModuleDeclaration = ts.buildOverload("createModuleDeclaration")
            .overload({
            0: function (modifiers, name, body, flags) {
                return createModuleDeclaration(modifiers, name, body, flags);
            },
            1: function (_decorators, modifiers, name, body, flags) {
                return createModuleDeclaration(modifiers, name, body, flags);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], name = _a[1], body = _a[2], flags = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name !== undefined && !ts.isArray(name)) &&
                    (body === undefined || ts.isModuleBody(body)) &&
                    (flags === undefined || typeof flags === "number");
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], name = _a[2], body = _a[3], flags = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name !== undefined && ts.isModuleName(name)) &&
                    (body === undefined || typeof body === "object") &&
                    (flags === undefined || typeof flags === "number");
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateModuleDeclaration = ts.buildOverload("updateModuleDeclaration")
            .overload({
            0: function (node, modifiers, name, body) {
                return updateModuleDeclaration(node, modifiers, name, body);
            },
            1: function (node, _decorators, modifiers, name, body) {
                return updateModuleDeclaration(node, modifiers, name, body);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], name = _a[2], body = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (name === undefined || !ts.isArray(name)) &&
                    (body === undefined || ts.isModuleBody(body));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], name = _a[3], body = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (name !== undefined && ts.isModuleName(name)) &&
                    (body === undefined || ts.isModuleBody(body));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createImportEqualsDeclaration = ts.buildOverload("createImportEqualsDeclaration")
            .overload({
            0: function (modifiers, isTypeOnly, name, moduleReference) {
                return createImportEqualsDeclaration(modifiers, isTypeOnly, name, moduleReference);
            },
            1: function (_decorators, modifiers, isTypeOnly, name, moduleReference) {
                return createImportEqualsDeclaration(modifiers, isTypeOnly, name, moduleReference);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], isTypeOnly = _a[1], name = _a[2], moduleReference = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (isTypeOnly === undefined || typeof isTypeOnly === "boolean") &&
                    (typeof name !== "boolean") &&
                    (typeof moduleReference !== "string");
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], isTypeOnly = _a[2], name = _a[3], moduleReference = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (isTypeOnly === undefined || typeof isTypeOnly === "boolean") &&
                    (typeof name === "string" || ts.isIdentifier(name)) &&
                    (moduleReference !== undefined && ts.isModuleReference(moduleReference));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateImportEqualsDeclaration = ts.buildOverload("updateImportEqualsDeclaration")
            .overload({
            0: function (node, modifiers, isTypeOnly, name, moduleReference) {
                return updateImportEqualsDeclaration(node, modifiers, isTypeOnly, name, moduleReference);
            },
            1: function (node, _decorators, modifiers, isTypeOnly, name, moduleReference) {
                return updateImportEqualsDeclaration(node, modifiers, isTypeOnly, name, moduleReference);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], isTypeOnly = _a[2], name = _a[3], moduleReference = _a[4], other = _a[5];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (isTypeOnly === undefined || typeof isTypeOnly === "boolean") &&
                    (typeof name !== "boolean") &&
                    (typeof moduleReference !== "string");
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], isTypeOnly = _a[3], name = _a[4], moduleReference = _a[5];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (isTypeOnly === undefined || typeof isTypeOnly === "boolean") &&
                    (typeof name === "string" || ts.isIdentifier(name)) &&
                    (moduleReference !== undefined && ts.isModuleReference(moduleReference));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createImportDeclaration = ts.buildOverload("createImportDeclaration")
            .overload({
            0: function (modifiers, importClause, moduleSpecifier, assertClause) {
                return createImportDeclaration(modifiers, importClause, moduleSpecifier, assertClause);
            },
            1: function (_decorators, modifiers, importClause, moduleSpecifier, assertClause) {
                return createImportDeclaration(modifiers, importClause, moduleSpecifier, assertClause);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], importClause = _a[1], moduleSpecifier = _a[2], assertClause = _a[3], other = _a[4];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (importClause === undefined || !ts.isArray(importClause)) &&
                    (moduleSpecifier !== undefined && ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], importClause = _a[2], moduleSpecifier = _a[3], assertClause = _a[4];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (importClause === undefined || ts.isImportClause(importClause)) &&
                    (moduleSpecifier !== undefined && ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateImportDeclaration = ts.buildOverload("updateImportDeclaration")
            .overload({
            0: function (node, modifiers, importClause, moduleSpecifier, assertClause) {
                return updateImportDeclaration(node, modifiers, importClause, moduleSpecifier, assertClause);
            },
            1: function (node, _decorators, modifiers, importClause, moduleSpecifier, assertClause) {
                return updateImportDeclaration(node, modifiers, importClause, moduleSpecifier, assertClause);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], importClause = _a[2], moduleSpecifier = _a[3], assertClause = _a[4], other = _a[5];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (importClause === undefined || !ts.isArray(importClause)) &&
                    (moduleSpecifier === undefined || ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], importClause = _a[3], moduleSpecifier = _a[4], assertClause = _a[5];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (importClause === undefined || ts.isImportClause(importClause)) &&
                    (moduleSpecifier !== undefined && ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createExportAssignment = ts.buildOverload("createExportAssignment")
            .overload({
            0: function (modifiers, isExportEquals, expression) {
                return createExportAssignment(modifiers, isExportEquals, expression);
            },
            1: function (_decorators, modifiers, isExportEquals, expression) {
                return createExportAssignment(modifiers, isExportEquals, expression);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], isExportEquals = _a[1], expression = _a[2], other = _a[3];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (isExportEquals === undefined || typeof isExportEquals === "boolean") &&
                    (typeof expression === "object");
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], isExportEquals = _a[2], expression = _a[3];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (isExportEquals === undefined || typeof isExportEquals === "boolean") &&
                    (expression !== undefined && ts.isExpression(expression));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateExportAssignment = ts.buildOverload("updateExportAssignment")
            .overload({
            0: function (node, modifiers, expression) {
                return updateExportAssignment(node, modifiers, expression);
            },
            1: function (node, _decorators, modifiers, expression) {
                return updateExportAssignment(node, modifiers, expression);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], expression = _a[2], other = _a[3];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (expression !== undefined && !ts.isArray(expression));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], expression = _a[3];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (expression !== undefined && ts.isExpression(expression));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.createExportDeclaration = ts.buildOverload("createExportDeclaration")
            .overload({
            0: function (modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause) {
                return createExportDeclaration(modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause);
            },
            1: function (_decorators, modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause) {
                return createExportDeclaration(modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[0], isTypeOnly = _a[1], exportClause = _a[2], moduleSpecifier = _a[3], assertClause = _a[4], other = _a[5];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (typeof isTypeOnly === "boolean") &&
                    (typeof exportClause !== "boolean") &&
                    (moduleSpecifier === undefined || ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
            1: function (_a) {
                var decorators = _a[0], modifiers = _a[1], isTypeOnly = _a[2], exportClause = _a[3], moduleSpecifier = _a[4], assertClause = _a[5];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (typeof isTypeOnly === "boolean") &&
                    (exportClause === undefined || ts.isNamedExportBindings(exportClause)) &&
                    (moduleSpecifier === undefined || ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
        factory.updateExportDeclaration = ts.buildOverload("updateExportDeclaration")
            .overload({
            0: function (node, modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause) {
                return updateExportDeclaration(node, modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause);
            },
            1: function (node, _decorators, modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause) {
                return updateExportDeclaration(node, modifiers, isTypeOnly, exportClause, moduleSpecifier, assertClause);
            },
        })
            .bind({
            0: function (_a) {
                var modifiers = _a[1], isTypeOnly = _a[2], exportClause = _a[3], moduleSpecifier = _a[4], assertClause = _a[5], other = _a[6];
                return (other === undefined) &&
                    (modifiers === undefined || ts.every(modifiers, ts.isModifier)) &&
                    (typeof isTypeOnly === "boolean") &&
                    (typeof exportClause !== "boolean") &&
                    (moduleSpecifier === undefined || ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
            1: function (_a) {
                var decorators = _a[1], modifiers = _a[2], isTypeOnly = _a[3], exportClause = _a[4], moduleSpecifier = _a[5], assertClause = _a[6];
                return (decorators === undefined || ts.every(decorators, ts.isDecorator)) &&
                    (modifiers === undefined || ts.isArray(modifiers)) &&
                    (typeof isTypeOnly === "boolean") &&
                    (exportClause === undefined || ts.isNamedExportBindings(exportClause)) &&
                    (moduleSpecifier === undefined || ts.isExpression(moduleSpecifier)) &&
                    (assertClause === undefined || ts.isAssertClause(assertClause));
            },
        })
            .deprecate({
            1: DISALLOW_DECORATORS
        })
            .finish();
    }
    // Patch `createNodeFactory` because it creates the factories that are provided to transformers
    // in the public API.
    var prevCreateNodeFactory = ts.createNodeFactory;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
    ts.createNodeFactory = function (flags, baseFactory) {
        var factory = prevCreateNodeFactory(flags, baseFactory);
        patchNodeFactory(factory);
        return factory;
    };
    // Patch `ts.factory` because its public
    patchNodeFactory(ts.factory);
})(ts || (ts = {}));
//# sourceMappingURL=deprecatedCompat.js.map