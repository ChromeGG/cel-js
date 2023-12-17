import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface ExprCstNode extends CstNode {
  name: "expr";
  children: ExprCstChildren;
}

export type ExprCstChildren = {
  conditionalOr: ConditionalOrCstNode[];
};

export interface ConditionalAndCstNode extends CstNode {
  name: "conditionalAnd";
  children: ConditionalAndCstChildren;
}

export type ConditionalAndCstChildren = {
  lhs: RelationCstNode[];
  LogicalAndOperator?: IToken[];
  rhs?: RelationCstNode[];
};

export interface ConditionalOrCstNode extends CstNode {
  name: "conditionalOr";
  children: ConditionalOrCstChildren;
}

export type ConditionalOrCstChildren = {
  lhs: ConditionalAndCstNode[];
  LogicalOrOperator?: IToken[];
  rhs?: ConditionalAndCstNode[];
};

export interface RelationCstNode extends CstNode {
  name: "relation";
  children: RelationCstChildren;
}

export type RelationCstChildren = {
  lhs: AdditionCstNode[];
  ComparisonOperator?: IToken[];
  rhs?: AdditionCstNode[];
};

export interface AdditionCstNode extends CstNode {
  name: "addition";
  children: AdditionCstChildren;
}

export type AdditionCstChildren = {
  lhs: MultiplicationCstNode[];
  AdditionOperator?: IToken[];
  rhs?: MultiplicationCstNode[];
};

export interface MultiplicationCstNode extends CstNode {
  name: "multiplication";
  children: MultiplicationCstChildren;
}

export type MultiplicationCstChildren = {
  lhs: AtomicExpressionCstNode[];
  MultiplicationOperator?: IToken[];
  rhs?: AtomicExpressionCstNode[];
};

export interface ParenthesisExpressionCstNode extends CstNode {
  name: "parenthesisExpression";
  children: ParenthesisExpressionCstChildren;
}

export type ParenthesisExpressionCstChildren = {
  open: IToken[];
  expr: ExprCstNode[];
  close: IToken[];
};

export interface AtomicExpressionCstNode extends CstNode {
  name: "atomicExpression";
  children: AtomicExpressionCstChildren;
}

export type AtomicExpressionCstChildren = {
  parenthesisExpression?: ParenthesisExpressionCstNode[];
  BooleanLiteral?: IToken[];
  Null?: IToken[];
  StringLiteral?: IToken[];
  Float?: IToken[];
  Integer?: IToken[];
  ReservedIdentifiers?: IToken[];
  Identifier?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  expr(children: ExprCstChildren, param?: IN): OUT;
  conditionalAnd(children: ConditionalAndCstChildren, param?: IN): OUT;
  conditionalOr(children: ConditionalOrCstChildren, param?: IN): OUT;
  relation(children: RelationCstChildren, param?: IN): OUT;
  addition(children: AdditionCstChildren, param?: IN): OUT;
  multiplication(children: MultiplicationCstChildren, param?: IN): OUT;
  parenthesisExpression(children: ParenthesisExpressionCstChildren, param?: IN): OUT;
  atomicExpression(children: AtomicExpressionCstChildren, param?: IN): OUT;
}
