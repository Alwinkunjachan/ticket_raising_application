import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface MemberAttributes {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  passwordHash: string | null;
  googleId: string | null;
  provider: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MemberCreationAttributes
  extends Optional<MemberAttributes, 'id' | 'avatarUrl' | 'passwordHash' | 'googleId' | 'provider'> {}

export class Member
  extends Model<MemberAttributes, MemberCreationAttributes>
  implements MemberAttributes
{
  declare id: string;
  declare name: string;
  declare email: string;
  declare avatarUrl: string | null;
  declare passwordHash: string | null;
  declare googleId: string | null;
  declare provider: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Member.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'local',
    },
  },
  {
    sequelize,
    tableName: 'members',
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['passwordHash'] },
      },
    },
  }
);
