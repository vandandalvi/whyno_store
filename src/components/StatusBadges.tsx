import type { OrderStatus, PaymentStatus, ProductStatus } from "@prisma/client";

const ORDER: Record<OrderStatus, [string, string]> = {
  PENDING: ["New", "bg-lime text-lime-ink"],
  PROCESSING: ["Being prepared", "bg-blue-100 text-blue-900"],
  SHIPPED: ["Shipped", "bg-purple-100 text-purple-900"],
  DELIVERED: ["Delivered", "bg-green-100 text-green-900"],
  CANCELLED: ["Cancelled", "bg-red-100 text-red-900"],
};
export const ORDER_LABEL = (s: OrderStatus) => ORDER[s][0];
export const OrderBadge = ({ status }: { status: OrderStatus }) => <span className={`badge ${ORDER[status][1]}`}>{ORDER[status][0]}</span>;

export const PaymentBadge = ({ status }: { status: PaymentStatus }) =>
  status === "VERIFIED" ? (
    <span className="badge bg-green-100 text-green-900">Paid (verified)</span>
  ) : status === "REFUNDED" ? (
    <span className="badge bg-sand text-ink">Refunded</span>
  ) : (
    <span className="badge border border-dashed border-lime-deep bg-lime/40 text-lime-ink">Demo payment — not real money</span>
  );

const PRODUCT: Record<ProductStatus, [string, string]> = {
  PUBLISHED: ["Visible", "bg-green-100 text-green-900"],
  DRAFT: ["Hidden", "bg-sand text-mute"],
  ARCHIVED: ["Archived", "bg-red-100 text-red-900"],
};
export const ProductBadge = ({ status }: { status: ProductStatus }) => <span className={`badge ${PRODUCT[status][1]}`}>{PRODUCT[status][0]}</span>;
