export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
};

export type UpdateDisplayNameInput = {
  userId: string;
  displayName: string;
};
