export type Invite = {
  code: string;
  expiresAt: string;
};

export type RedeemInviteResult = {
  conversationId: string;
  otherUserId: string;
};
