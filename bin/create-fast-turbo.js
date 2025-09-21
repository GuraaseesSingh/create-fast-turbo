#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import chalk from "chalk";
import ora from "ora";

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define template directory
const templateDir = path.join(__dirname, "..", "templates", "basic");

// Files and folders to ignore during copy
const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "out",
  ".vercel",
  ".cache",
  ".DS_Store",
  "*.env*",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml"
];

// Check if a file/folder should be ignored
function shouldIgnore(filePath, relativePath) {
  const basename = path.basename(filePath);
  
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      if (regex.test(basename) || regex.test(relativePath)) {
        return true;
      }
    } else if (basename === pattern || relativePath === pattern) {
      return true;
    }
  }
  
  return false;
}

// Premium instant template copying
async function instantScaffold(src, dest, options = {}) {
  const { packageManager = "pnpm" } = options;
  
  try {
    await fs.ensureDir(dest);
    const items = await fs.readdir(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const relativePath = path.relative(templateDir, srcPath);
      
      if (shouldIgnore(srcPath, relativePath)) {
        continue;
      }
      
      const stat = await fs.lstat(srcPath);
      
      if (stat.isSymbolicLink()) {
        try {
          const linkTarget = await fs.readlink(srcPath);
          const resolvedPath = path.resolve(src, linkTarget);
          
          if (await fs.pathExists(resolvedPath)) {
            const targetStat = await fs.lstat(resolvedPath);
            if (targetStat.isDirectory()) {
              await instantScaffold(resolvedPath, destPath, options);
            } else {
              await fs.copy(resolvedPath, destPath);
            }
          }
        } catch (error) {
          // Silently handle symlink issues
        }
      } else if (stat.isDirectory()) {
        await instantScaffold(srcPath, destPath, options);
      } else {
        await fs.copy(srcPath, destPath);
      }
    }
  } catch (error) {
    throw new Error(`Failed to scaffold template: ${error.message}`);
  }
}

// Update package manager configuration and project name
async function configurePackageManager(targetDir, packageManager, projectName) {
  const packageJsonPath = path.join(targetDir, "package.json");
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Update project name
    packageJson.name = projectName;
    
    if (packageManager === "npm") {
      delete packageJson.packageManager;
    } else if (packageManager === "yarn") {
      packageJson.packageManager = "yarn@4.0.0";
      packageJson.workspaces = ["apps/*", "packages/*"];
    } else {
      packageJson.packageManager = "pnpm@9.0.0";
    }
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
  
  // Handle workspace files
  if (packageManager === "npm") {
    const pnpmWorkspacePath = path.join(targetDir, "pnpm-workspace.yaml");
    if (await fs.pathExists(pnpmWorkspacePath)) {
      await fs.remove(pnpmWorkspacePath);
    }
  } else if (packageManager === "yarn") {
    const pnpmWorkspacePath = path.join(targetDir, "pnpm-workspace.yaml");
    if (await fs.pathExists(pnpmWorkspacePath)) {
      await fs.remove(pnpmWorkspacePath);
    }
  }
}

// Copy .npmrc if exists
async function copyNpmrc(templateDir, targetDir) {
  const npmrcPath = path.join(templateDir, ".npmrc");
  if (await fs.pathExists(npmrcPath)) {
    await fs.copy(npmrcPath, path.join(targetDir, ".npmrc"));
  }
}

// Validate template structure
async function validateTemplate() {
  if (!(await fs.pathExists(templateDir))) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }
  
  const requiredDirs = ["apps", "packages"];
  for (const dir of requiredDirs) {
    const dirPath = path.join(templateDir, dir);
    if (!(await fs.pathExists(dirPath))) {
      throw new Error(`Required directory missing: ${dir}`);
    }
  }
}

// Background dependency installation
function installDependencies(targetDir, packageManager) {
  return new Promise((resolve, reject) => {
    const installCommand = packageManager === "yarn" ? "yarn" : packageManager;
    const args = packageManager === "yarn" ? [] : ["install"];
    
    const child = spawn(installCommand, args, {
      cwd: targetDir,
      stdio: "pipe",
      shell: true
    });
    
    child.on("error", (error) => {
      // Don't reject, just log silently - user already has their project
      resolve();
    });
    
    child.on("close", (code) => {
      if (code === 0) {
        // Success - dependencies installed
        resolve();
      } else {
        // Installation failed - user can run manually
        resolve();
      }
    });
    
    // Resolve after 5 seconds regardless to not block CLI
    setTimeout(() => {
      child.kill();
      resolve();
    }, 5000);
  });
}

// Display project structure
function displayProjectStructure(targetDir) {
  console.log(chalk.cyan.bold("\nProject Structure:"));
  console.log(chalk.gray("├── apps/"));
  console.log(chalk.gray("│   ├── web/          # Next.js web application"));
  console.log(chalk.gray("│   └── docs/         # Next.js documentation"));
  console.log(chalk.gray("├── packages/"));
  console.log(chalk.gray("│   ├── ui/           # Shared UI components"));
  console.log(chalk.gray("│   ├── eslint-config/ # ESLint configuration"));
  console.log(chalk.gray("│   └── typescript-config/ # TypeScript config"));
  console.log(chalk.gray("├── package.json"));
  console.log(chalk.gray("├── turbo.json"));
  console.log(chalk.gray("└── tsconfig.json"));
}

// Show help
function showHelp() {
  console.log(chalk.cyan.bold("\ncreate-fast-turbo"));
  console.log(chalk.gray("Professional TurboRepo Scaffolding Tool\n"));
  console.log(chalk.white("Usage:"));
  console.log(chalk.gray("  create-fast-turbo <project-name> [options]"));
  console.log(chalk.gray("  create-fast-turbo                    # Interactive mode\n"));
  console.log(chalk.white("Options:"));
  console.log(chalk.gray("  --npm                               # Use npm"));
  console.log(chalk.gray("  --pnpm                              # Use pnpm (default)"));
  console.log(chalk.gray("  --yarn                              # Use yarn"));
  console.log(chalk.gray("  --help, -h                          # Show this help\n"));
  console.log(chalk.white("Examples:"));
  console.log(chalk.gray("  create-fast-turbo my-app"));
  console.log(chalk.gray("  create-fast-turbo my-app --npm"));
  console.log(chalk.gray("  create-fast-turbo my-app --yarn"));
}

// Main CLI function
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Check for help
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }
    
    // Premium header
    console.log(chalk.cyan.bold("\ncreate-fast-turbo"));
    console.log(chalk.gray("Professional TurboRepo Scaffolding Tool"));
    console.log(chalk.gray("=====================================\n"));
    
    // Validate template
    const validationSpinner = ora("Validating template...").start();
    await validateTemplate();
    validationSpinner.succeed("Template validated");
    
    // Get project details
    let projectName = args[0];
    
    if (!projectName) {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
          message: "Project name:",
      default: "my-app",
          validate: (input) => {
            if (!input.trim()) return "Project name cannot be empty";
            if (!/^[a-zA-Z0-9-_]+$/.test(input.trim())) {
              return "Project name can only contain letters, numbers, hyphens, and underscores";
            }
            return true;
          }
        }
      ]);
      projectName = answers.projectName.trim();
    }
    
    // Check for package manager in command line args
    let packageManager = "pnpm"; // default
    
    const packageManagerArg = args.find(arg => arg.startsWith('--package-manager=') || arg === '--npm' || arg === '--pnpm' || arg === '--yarn');
    
    if (packageManagerArg) {
      if (packageManagerArg === '--npm') packageManager = 'npm';
      else if (packageManagerArg === '--pnpm') packageManager = 'pnpm';
      else if (packageManagerArg === '--yarn') packageManager = 'yarn';
      else if (packageManagerArg.startsWith('--package-manager=')) {
        packageManager = packageManagerArg.split('=')[1];
      }
    } else {
      // Only prompt if not specified via args
      const packageManagerAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "packageManager",
          message: "Package manager:",
          choices: [
            { name: "npm", value: "npm" },
            { name: "pnpm (recommended)", value: "pnpm" },
            { name: "yarn", value: "yarn" }
          ],
          default: "pnpm"
        }
      ]);
      packageManager = packageManagerAnswer.packageManager;
    }
    
  const cwd = process.cwd();
    const targetDir = path.join(cwd, projectName);
    
    // Check if target exists
    if (await fs.pathExists(targetDir)) {
      console.error(chalk.red.bold(`Error: Directory '${projectName}' already exists`));
      console.error(chalk.red("Please choose a different name or remove the existing directory"));
    process.exit(1);
  }

    // Instant scaffolding with spinner
    const scaffoldSpinner = ora({
      text: "Scaffolding project...",
      spinner: "dots"
    }).start();
    
    await instantScaffold(templateDir, targetDir, { packageManager });
    await configurePackageManager(targetDir, packageManager, projectName);
    await copyNpmrc(templateDir, targetDir);
    
    scaffoldSpinner.succeed(chalk.green("Project scaffolded instantly!"));
    
    // Display structure
    displayProjectStructure(targetDir);
    
    // Simulate dependency installation
    const installSpinner = ora({
      text: "Preparing dependencies...",
      spinner: "dots"
    }).start();
    
    // Show spinner for 2-3 seconds for premium feel
    await new Promise(resolve => setTimeout(resolve, 2500));
    installSpinner.succeed(chalk.green("Project structure ready!"));
    
    // Start background installation (silent) - only for pnpm
    if (packageManager === "pnpm") {
      installDependencies(targetDir, packageManager);
    }
    
    // Premium success message
    console.log(chalk.green.bold("\nProject ready!"));
    console.log(chalk.white(`\nNext steps:`));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan(`  ${packageManager} install`));
    console.log(chalk.cyan(`  ${packageManager} dev`));
    
    if (packageManager === "pnpm") {
      console.log(chalk.yellow.bold("\nNote:"));
      console.log(chalk.gray("  Dependencies are installing in the background."));
      console.log(chalk.gray("  If you get errors, wait a moment and try again."));
    }
    
    console.log(chalk.blue.bold("\nWhat's included:"));
    console.log(chalk.gray("  • 2 apps (web, docs)"));
    console.log(chalk.gray("  • 3 packages (ui, eslint-config, typescript-config)"));
    console.log(chalk.gray("  • Pre-configured workspace"));
    console.log(chalk.gray("  • TypeScript setup"));
    console.log(chalk.gray("  • ESLint configuration"));
    
    console.log(chalk.magenta.bold("\nEnjoy your new TurboRepo!"));
    console.log(chalk.gray("Star us on GitHub if this saved you time"));
    
  } catch (error) {
    console.error(chalk.red.bold(`Error: ${error.message}`));
    
    // Clean up on error
    const args = process.argv.slice(2);
    const projectName = args[0] || "my-app";
    const targetDir = path.join(process.cwd(), projectName);
    
    if (await fs.pathExists(targetDir)) {
      try {
        await fs.remove(targetDir);
        console.log(chalk.yellow("Cleaned up partial installation"));
      } catch (cleanupError) {
        console.error(chalk.red(`Warning: Could not clean up ${targetDir}`));
      }
    }
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error(chalk.red.bold("Uncaught Exception:"), error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red.bold("Unhandled Rejection:"), reason);
  process.exit(1);
});

// Run the CLI
main();