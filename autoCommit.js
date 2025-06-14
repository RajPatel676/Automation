const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const readline = require("readline");
const chalk = require("chalk");

// Constants
const TARGET_FOLDER = "Test";
const git = simpleGit();
const MAX_RETRIES = 3;

// Initialize CLI interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Utility: Delay
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Utility: Get all file paths in directory
const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
};

// Utility: Generate deterministic commit message based on content
const generateCommitMessages = (files, count) => {
    const contentHash = files.map((file) => {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n").length;
        return { file, lines };
    });

    contentHash.sort((a, b) => b.lines - a.lines);

    const messages = [];
    for (let i = 0; i < count; i++) {
        const f = contentHash[i % contentHash.length];
        const message = `Refactor ${path.basename(f.file)} - ${f.lines} lines analyzed`;
        messages.push(message);
    }
    return messages;
};

// Utility: Log errors clearly
const handleError = (message, error) => {
    console.log(chalk.red(`\n[ERROR] ${message}`));
    if (error) console.log(chalk.yellow(error.message || error));
};

// Prompt user for number of commits
const askCommitCount = () => {
    return new Promise((resolve) => {
        rl.question("🧠 How many commits do you want to generate? ", (input) => {
            const number = parseInt(input);
            if (isNaN(number) || number < 1) {
                console.log(chalk.red("❌ Invalid number. Try again."));
                process.exit(1);
            }
            resolve(number);
        });
    });
};

// Main logic
const startAutoCommit = async () => {
    try {
        // Check Git
        await git.status();

        // Get file list
        const files = getAllFiles(TARGET_FOLDER);
        if (files.length === 0) throw new Error("No files found in the Test folder.");

        const commitCount = await askCommitCount();
        const messages = generateCommitMessages(files, commitCount);

        // Commit loop
        for (let i = 0; i < commitCount; i++) {
            try {
                const msg = messages[i];
                await git.add(`${TARGET_FOLDER}/*`);
                await git.commit(msg);
                console.log(chalk.green(`✅ Commit ${i + 1}/${commitCount}: "${msg}"`));

                // Simulate human-like delay
                const waitTime = Math.floor(Math.random() * 25000 + 5000);
                await delay(waitTime);
            } catch (err) {
                handleError(`Failed to commit iteration ${i + 1}`, err);
                if (i < MAX_RETRIES) {
                    console.log(chalk.blue("🔁 Retrying commit..."));
                    i--;
                } else {
                    console.log(chalk.red("❌ Maximum retries reached."));
                    break;
                }
            }
        }

        // Push changes
        await git.push();
        console.log(chalk.blueBright("\n🚀 All commits pushed successfully."));
        rl.close();
    } catch (err) {
        if (err.message.includes("Not a git repository")) {
            handleError("Git repository not found. Please initialize using 'git init'.");
        } else if (err.message.includes("Permission denied")) {
            handleError("Permission error. Check SSH keys or Git credentials.");
        } else {
            handleError("Unexpected error occurred", err);
        }
        rl.close();
    }
};

// Start script
startAutoCommit();
