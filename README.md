# YouthUnite

Okay gang, to run this project you'll need to have bun, npm and docker installed on your local machine.

## Getting Started
First of all, I want you to go to `/backend` and run the following command:

```bash
bun install
```

Then, go to `/frontend` and run the following command:

```bash
npm install
```

Now we can get started.

### Setup the database
To setup the database, you'll need to run the following command in the root of the project:

```bash
docker-compose up -d
```

After that, you'll need to create the database schema. You can do this by running the following command in `/backend` where `package.json` is located:

```bash
bun drizzle-kit push
```

That's it. That's the database. Easy right? :3

### Environment Variables
You will need to create a `.env` file in the `/backend` directory. You can use the `.env.example` file as a reference. Make sure to set the `DB_URL` variable to match your database connection string.

### Running the backend
To run the backend, you'll need to go to `/backend` and run the following command:
```bash
bun run dev
```

### Running the frontend
To run the frontend, you'll need to go to `/frontend` and run the following command:
```bash
npm run dev
```