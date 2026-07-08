export type ReceiptStatus = "delivered" | "read";

export type MessageReceipt = {
  messageId: string;
  userId: string;
  status: ReceiptStatus;
  updatedAt: string;
};
