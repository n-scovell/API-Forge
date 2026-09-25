const fs = require("fs")
const { execSync } = require("child_process")
const readline = require("readline/promises");
const path = require("path")
const { emitKeypressEvents } = require("readline")

const args = {}
const getArgs = async () => {
    process.argv.forEach((arg, index) => {
        if (index < 2) return
        args[`arg${index}`] = arg
    })
    if (!args.arg2) {
        console.log('❌ Declare your command')
        return
    }  
}
getArgs()


const prismaContent = `
  import { PrismaClient } from "@prisma/client";
  export const prisma = new PrismaClient();
  `
  const serverContent =   `import app from "./app.js"
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
  console.log('RUNNING on PORT:3000')
  })`
  

  const configContent =  `import "dotenv/config";
  import { defineConfig } from "prisma/config";
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
  }
  export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
  path: "prisma/migrations",
  },
  datasource: {
  url: DATABASE_URL,
  },
  })`
  

  const schemaContent =   `generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`
  
  const corsContent = `import cors from "cors";
  export const corsMiddleware = cors({
  origin: [
    "http://localhost:5173",
  ],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  });`

const gitignoreContent = `
    node_modules
    .env
    .env.local
    .env.*.local
    /src/generated/prisma
`;

// GLOBALS
const makeFolder = async (fold, name) => {
  fs.mkdirSync(fold)
  console.log(`Project folder ${name} has been made`)
}
const runCommand = (cmd, projectPath) => {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: projectPath })
}
const { stdin, stdout } = require("process")
async function pause(message) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    await rl.question(`\n⏸️  ${message}\nPress ENTER to continue...`);
    rl.close();
}
const requestDBConnection = async() => {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const db = await rl.question("DATABASE_URL: ")
    rl.close()
    return db
}
const createFile = (projectPath, filename, content) => {
  fs.writeFileSync(path.join(projectPath, filename),
  `${content}`
  )
}
const writeFile = (file, text) => {
    fs.writeFileSync(path.join(projectPath, file), text)
    console.log(`${file} has been made`)
}

// FOLDERS GROUP A
const foldersA = [
    "src",
    "src/routes",
    "src/controllers",
    "src/services",
    "src/utils",
    "src/schemas",
    "prisma"
]
const gitignore = `
    node_modules
    .env
    .env.local
    .env.*.local
    /src/generated/prisma
`;
// const filaA = [
//     {file: "src/app.js", content: appContent},
//     {file: "src/prisma.js", content: prismaContent},
//     {file: "src/server.js", content: serverContent},
//     {file: "prisma/schema.prisma", content: schemaContent},
//     {file: "src/_cors.js", content: corsContent},
// ]

const buildApi = async () => {
    if (!args.arg3) {
        console.log('❌ Your third argument needs a name for your API project')
        return
    }
    const projectName = args.arg3.trim()
    const projectPath = path.join(process.cwd(), projectName)
    const appContent = `import express from "express";
    import { corsMiddleware } from "./_cors.js";
    ////
    //import here

    ///
    const app = express();
    app.use(corsMiddleware);
    app.use(express.json());
    app.get("/", (req, res) => {
    res.json({
        status: "ok",
        name: "${projectName}",
        version: "1.0.0",
    });
    });
    /////
    // use here

    /////
    export default app;
    `
    makeFolder(projectPath, projectName)
    runCommand("npm init -y", projectPath)
    runCommand("npm install express cors dotenv @prisma/client@6", projectPath)
    runCommand("npm install -D nodemon prisma@6", projectPath)
    foldersA.forEach((f) => {
        makeFolder(path.join(projectPath,f), f)
    })
    
    const { stdin, stdout } = require("process")

    async function askDb() {
        const rl = readline.createInterface({ input: stdin, output: stdout });
        const db = await rl.question("DATABASE_URL: ");
        rl.close();
        return db;
    }
    const databaseUrl = await askDb();
    fs.writeFileSync(path.join(projectPath, ".env"), `DATABASE_URL="${databaseUrl}"`)
    fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignore.trim());
    const pkgPath = path.join(projectPath, "package.json")
    const pkg = JSON.parse(fs.readFileSync(pkgPath))
    pkg.type = "module";
    pkg.scripts = {dev: "nodemon src/server.js", start: "node src/server.js",};
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    createFile(projectPath, "src/app.js", appContent)
    createFile(projectPath, "src/prisma.js", prismaContent)
    createFile(projectPath, "src/server.js", serverContent)
    createFile(projectPath, "prisma/schema.prisma", schemaContent)
    createFile(projectPath, "src/_cors.js", corsContent)
    runCommand("code prisma/schema.prisma", projectPath);
    await pause("Edit prisma/schema.prisma now (and your models)")
    runCommand('npx prisma migrate dev --name init', projectPath)
}
if (args.arg2 === 'api') {
    console.log('Building api')
    buildApi()
} else if (args.arg2 === 'service') {
    console.log('building service')
}
