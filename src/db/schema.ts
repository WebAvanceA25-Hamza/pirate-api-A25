import { mysqlTable, varchar, timestamp, int, mysqlEnum, boolean } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  username: varchar('username', {length: 50}).notNull().unique(),
  passwordHash: varchar('password_hash', {length: 255}).notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
});

export const ships = mysqlTable('ships', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', {length: 100}).notNull(),
  goldCargo: int('gold_cargo').notNull(),
  captain: varchar('captain', {length: 50}).notNull(),
  status: mysqlEnum('status', ['docked', 'sailing', 'lookingForAFight']).notNull(),
  crewSize: int('crew_size').notNull(),
  createdBy: varchar('created_by', { length: 38 }).notNull(),
  createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
})