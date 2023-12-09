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
  lhs: AtomicExpressionCstNode[];
  relOp?: RelOpCstNode[];
  rhs?: AtomicExpressionCstNode[];
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

export interface AtomicExpressionCstNode extends CstNode {
  name: "atomicExpression";
  children: AtomicExpressionCstChildren;
}

export type AtomicExpressionCstChildren = {
  Integer?: IToken[];
  ReservedIdentifiers?: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  expr(children: ExprCstChildren, param?: IN): OUT;
  relation(children: RelationCstChildren, param?: IN): OUT;
  relOp(children: RelOpCstChildren, param?: IN): OUT;
  atomicExpression(children: AtomicExpressionCstChildren, param?: IN): OUT;
}
