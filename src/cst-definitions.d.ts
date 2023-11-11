import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface CelExpressionCstNode extends CstNode {
  name: "celExpression";
  children: CelExpressionCstChildren;
}

export type CelExpressionCstChildren = {
  comparisonExpression: ComparisonExpressionCstNode[];
};

export interface ComparisonExpressionCstNode extends CstNode {
  name: "comparisonExpression";
  children: ComparisonExpressionCstChildren;
}

export type ComparisonExpressionCstChildren = {
  lhs: AtomicExpressionCstNode[];
  comparisonOperator: ComparisonOperatorCstNode[];
  rhs: AtomicExpressionCstNode[];
};

export interface ComparisonOperatorCstNode extends CstNode {
  name: "comparisonOperator";
  children: ComparisonOperatorCstChildren;
}

export type ComparisonOperatorCstChildren = {
  GreaterThan?: IToken[];
  LessThan?: IToken[];
};

export interface AtomicExpressionCstNode extends CstNode {
  name: "atomicExpression";
  children: AtomicExpressionCstChildren;
}

export type AtomicExpressionCstChildren = {
  Integer?: IToken[];
  Identifier?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  celExpression(children: CelExpressionCstChildren, param?: IN): OUT;
  comparisonExpression(children: ComparisonExpressionCstChildren, param?: IN): OUT;
  comparisonOperator(children: ComparisonOperatorCstChildren, param?: IN): OUT;
  atomicExpression(children: AtomicExpressionCstChildren, param?: IN): OUT;
}
