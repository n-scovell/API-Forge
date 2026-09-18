const { execSync } = require("child_process")
const fs = require("fs")
const readline = require("readline/promises");
const { emitKeypressEvents } = require("readline");
const path = require("path")

const { stdin: input, stdout: output } = require('node:process');

const rl = readline.createInterface({ input, output });

emitKeypressEvents(process.stdin);

// UNIVERSAL FUNCTIONS
const makeFolder = (fold, name) => {
  fs.mkdirSync(fold)
  console.log(`Project folder ${name} has been made`)
}
const createFile = (projectPath, filename, content) => {
  fs.writeFileSync(path.join(projectPath, filename),
  `${content}`
  )
}
const run = (cmd, projectPath) => {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: projectPath })
}

const buildAPI = () => {
  const projectName = process.argv[3]
  if (!projectName) {
    console.error("❌ Please provide a project name")
    process.exit(1)
  }
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

  // FUNCTIONS
  // const run = (cmd) => {
  //   console.log(`▶ ${cmd}`);
  //   execSync(cmd, { stdio: "inherit", cwd: projectPath })
  // }

  // const createFile = (projectPath, filename, content) => {
  //   fs.writeFileSync(path.join(projectPath, filename),
  //   `${content}`
  //   )
  // }
  //////////////

  const projectPath = path.join(process.cwd(), projectName)
  makeFolder(projectPath, projectName)
  run("npm init -y", projectPath)
  // run("npm install express cors dotenv @prisma/client@6", projectPath)
  // run("npm install -D nodemon prisma@6", projectPath)

  const folders = [
    "src",
    "src/routes",
    "src/controllers",
    "src/services",
    "src/utils",
    "src/schemas",
    "prisma"
  ]
  folders.forEach((f) => {
      makeFolder(path.join(projectPath,f), f)
  })

  const { stdin, stdout } = require("process");
  async function askDb() {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const db = await rl.question("DATABASE_URL: ");
    rl.close();
    return db;
  }

  (async () => {
    const databaseUrl = await askDb();
    fs.writeFileSync(
      path.join(projectPath, ".env"),
      `DATABASE_URL="${databaseUrl}"`
    );
    
    const gitignore = `
    node_modules
    .env
    .env.local
    .env.*.local
    /src/generated/prisma
    `;

    fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignore.trim());

    const pkgPath = path.join(projectPath, "package.json")
    const pkg = JSON.parse(fs.readFileSync(pkgPath))
    pkg.type = "module";
    pkg.scripts = {
      dev: "nodemon src/server.js",
      start: "node src/server.js",
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    createFile(projectPath, "src/app.js", appContent)
    createFile(projectPath, "src/prisma.js", prismaContent)
    createFile(projectPath, "src/server.js", serverContent)
    createFile(projectPath, "prisma/schema.prisma", schemaContent)
    createFile(projectPath, "src/_cors.js", corsContent)


    const { stdin, stdout } = require("process");

    async function pause(message) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    await rl.question(`\n⏸️  ${message}\nPress ENTER to continue...`);
    rl.close();
    }
    run("code prisma/schema.prisma", projectPath);
    await pause("Edit prisma/schema.prisma now (and your models)")
    run('npx prisma migrate dev --name init', projectPath)
    
  })();
}


async function waitForInput(prompt = "Enter your content: ") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(prompt);
  rl.close();
  return answer;
}

async function selectOption(prompt, options) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    process.stdin.setRawMode(true);
    const render = () => {
      console.clear();
      console.log(`\n${prompt}\n`);
      options.forEach((option, index) => {
        if (index === selectedIndex) {
          console.log(`→ ${option}`);
        } else {
          console.log(`  ${option}`);
        }
      });
      console.log('\n↑/↓: Navigate   Enter: Select   Ctrl+C: Cancel');
    };
    render();
    const onKeypress = (str, key) => {
      if (key.name === 'up' && selectedIndex > 0) {
        selectedIndex--;
      } else if (key.name === 'down' && selectedIndex < options.length - 1) {
        selectedIndex++;
      } else if (key.name === 'return') {
        cleanup();
        resolve(options[selectedIndex]);
      } else if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      render();
    };
    process.stdin.on('keypress', onKeypress);

    function cleanup() {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      rl.close();
      console.clear();
    }
  });
}



async function buildService() {
  const projectPath = path.join(process.cwd(), process.argv[3])
  const userInput = await waitForInput("What is the name of your table: ")

  console.log(`CREATING CONTROLLER FILE FOR ${userInput}`)

  let ctrlPay = '';
  let servPay = '';

function EndpointAddition(e) {
  switch(e) {
    case "none":
      console.log('Goodbye! No endpoint added.');
      break;
    case "getAll":
      ctrlPay += `
      getAll: async (req, res) => {
        try {
          const ${userInput} = await ${userInput}Service.getAll(req.query);
          res.json(${userInput});
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      },
      `;
      servPay += `
        getAll: async (filters) => {
          const { watched, era, tag, search } = filters;
          return prisma.${userInput}.findMany({
            orderBy: { createdAt: "desc", },
          });
        },
      `
    break;
    case "getById":
      ctrlPay += `
      getById: async (req, res) => {
        try {
          const movie = await ${userInput}Service.getById(req.params.id);
          res.json(movie);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      },
      `
      servPay += `
        getById: async (id) => {
          return prisma.${userInput}.findUnique({
            where: { id: Number(id) },
          });
        },
      `
    break;
    case "create":
      ctrlPay += `
      create: async (req, res) => {
        try {
          const ${userInput} = await ${userInput}Service.create(req.body);
          res.status(201).json(${userInput});
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      },
      `
      servPay += `
        create: async (data) => {
          const existing = await prisma.${userInput}.findFirst({
            where: {
              tempA: data.tempA,
              tempB: data.tempB,
            },
          });
          if (existing) {
            throw new Error("Already exists!");
          }
          return await prisma.${userInput}.create({
            data,
          });
        },
      `
    break;
    case "update":
      ctrlPay += `
      update: async (req, res) => {
        try {
          const ${userInput} = await ${userInput}Service.update(req.params.id, req.body);
          res.json(${userInput});
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      },
      `
      servPay += `
        update: async (id, data) => {
          return prisma.${userInput}.update({
            where: { id: Number(id) },
            data,
          });
        },
      `
    break;
    case "remove":
      ctrlPay += `
      remove: async (req, res) => {
        try {
          await ${userInput}Service.remove(req.params.id);
          res.json({ message: "Deleted" });
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      }
      `
      servPay += `
      remove: async (id) => {
        return prisma.${userInput}.delete({
          where: { id: Number(id) },
        });
      },
      `
    break;
    default:
      console.log('Moving on...');
  }
}

let addMore = 'Yes';
let availableEndpoints = ['getAll', 'getById', 'create', 'update', 'remove'];
while (addMore === 'Yes' && availableEndpoints.length > 0) {
  const confirmBoolean = ['Yes', 'No'];
  addMore = await selectOption('Would you like to add an endpoint?', confirmBoolean);
  if (addMore === 'Yes') {
    const endpointChoice = await selectOption(
      'Choose your endpoint to add', 
      [...availableEndpoints, 'none']
    );
    if (endpointChoice === 'none') {
      console.log('No more endpoints added.');
      addMore = 'No';
    } else {
      EndpointAddition(endpointChoice);
      availableEndpoints = availableEndpoints.filter(ep => ep !== endpointChoice);
    }
  }
}

  const importStatement = `import ${userInput}Routes from "./routes/${userInput}Routes.js";`
  const routeStatement = `app.use("/api/${userInput}", ${userInput}Routes);`

  const filePath = path.join(projectPath, 'src/app.js');
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /\/\/import here/g,
    `//import here\n${importStatement}`
  );
  content = content.replace(
    /\/\/ use here/g,
    `// use here\n${routeStatement}`
  );
  fs.writeFileSync(filePath, content, 'utf8');
  

  createFile(
    path.join(projectPath, 'src/controllers'), 
    userInput+'Controller.js', 
    `
    import { ${userInput}Service } from "../services/${userInput}Service.js";
    export const ${userInput}Controller = {
      ${ctrlPay}
    };
    `
  )
  createFile(
    path.join(projectPath, 'src/services'), 
    userInput+'Service.js',
    `
    import { prisma } from "../prisma.js";
    export const ${userInput}Service = {
      ${servPay}
    };
    `
  )
  
  createFile(
    path.join(projectPath, 'src/routes'), 
    userInput+'Routes.js', 
    `
    import express from "express";
    import { ${userInput}Controller } from "../controllers/${userInput}Controller.js";
    const router = express.Router();
    router.get("/", ${userInput}Controller.getAll);
    router.get("/:id", ${userInput}Controller.getById);
    router.post("/", ${userInput}Controller.create);
    router.patch("/:id", ${userInput}Controller.update);
    router.delete("/:id", ${userInput}Controller.remove);
    export default router;
    `
  )

  const choicesB = [ 'Yes', 'No' ]
  const selectedB = await selectOption('Would you like to setup another table?', choicesB)
  if (selectedB === 'No') {
    console.log(projectPath)
    run("npm run dev", projectPath)
  } else {
    buildService()
  }
}


//INITIAL RUN
const chosenRoute = process.argv[2]
if (chosenRoute === 'api') {
  console.log('BUILDING YOUR API')
  buildAPI()
} else if (chosenRoute === 'service') {
  console.log('SERVICE AT WORK')
  buildService()
}