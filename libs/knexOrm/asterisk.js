import knex from "knex";

export default knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    database: process.env.DB_ASTERISK,
    password: process.env.DB_PASS
  }
});