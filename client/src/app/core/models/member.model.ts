export interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: string;
  role: string;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}
