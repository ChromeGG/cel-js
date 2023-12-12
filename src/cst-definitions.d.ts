import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface ExprCstNode extends CstNode {
  name: "expr";
  children: ExprCstChildren;
}

export type ExprCstChildren = {
  relation: RelationCstNode[];
};

export interface RelationCstNode extends CstNode {
  name: "relation";
  children: RelationCstChildren;
}

export type RelationCstChildren = {
  lhs: AdditionCstNode[];
  relOp?: RelOpCstNode[];
  rhs?: AdditionCstNode[];
};

export interface RelOpCstNode extends CstNode {
  name: "relOp";
  children: RelOpCstChildren;
}

export type RelOpCstChildren = {
  gte?: IToken[];
  lte?: IToken[];
  gt?: IToken[];
  lt?: IToken[];
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
  Integer?: IToken[];
  ReservedIdentifiers?: IToken[];
  Identifier?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  expr(children: ExprCstChildren, param?: IN): OUT;
  relation(children: RelationCstChildren, param?: IN): OUT;
  relOp(children: RelOpCstChildren, param?: IN): OUT;
  addition(children: AdditionCstChildren, param?: IN): OUT;
  multiplication(children: MultiplicationCstChildren, param?: IN): OUT;
  parenthesisExpression(children: ParenthesisExpressionCstChildren, param?: IN): OUT;
  atomicExpression(children: AtomicExpressionCstChildren, param?: IN): OUT;
}
