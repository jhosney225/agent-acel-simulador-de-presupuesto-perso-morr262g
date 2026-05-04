
```javascript
#!/usr/bin/env node

const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

// Budget simulator with Claude conversation
class BudgetSimulator {
  constructor() {
    this.conversationHistory = [];
    this.budget = {
      income: 0,
      expenses: {},
      savings: 0,
    };
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async chat(userMessage) {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: `You are a helpful personal budget advisor. You help users manage their monthly budget, track expenses, and provide financial recommendations. 
      
      Current budget state:
      - Monthly Income: $${this.budget.income}
      - Expenses: ${JSON.stringify(this.budget.expenses)}
      - Savings: $${this.budget.savings}
      
      Help the user understand their finances, suggest budget adjustments, and answer questions about their spending habits.
      Be practical, encouraging, and provide specific recommendations.`,
      messages: this.conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    return assistantMessage;
  }

  addExpense(category, amount) {
    if (!this.budget.expenses[category]) {
      this.budget.expenses[category] = 0;
    }
    this.budget.expenses[category] += amount;
  }

  setIncome(amount) {
    this.budget.income = amount;
  }

  calculateTotalExpenses() {
    return Object.values(this.budget.expenses).reduce((a, b) => a + b, 0);
  }

  calculateBalance() {
    const totalExpenses = this.calculateTotalExpenses();
    return this.budget.income - totalExpenses;
  }

  displayBudgetSummary() {
    console.log("\n========== BUDGET SUMMARY ==========");
    console.log(`Monthly Income: $${this.budget.income.toFixed(2)}`);
    console.log("\nExpenses by Category:");
    for (const [category, amount] of Object.entries(this.budget.expenses)) {
      const percentage = ((amount / this.budget.income) * 100).toFixed(1);
      console.log(`  ${category}: $${amount.toFixed(2)} (${percentage}%)`);
    }
    const totalExpenses = this.calculateTotalExpenses();
    console.log(`\nTotal Expenses: $${totalExpenses.toFixed(2)}`);
    const balance = this.calculateBalance();
    console.log(`Balance: $${balance.toFixed(2)}`);
    if (balance > 0) {
      console.log(
        `Status: You have $${balance.toFixed(2)} available for savings or discretionary spending.`
      );
    } else {
      console.log(
        `Status: You are over budget by $${Math.abs(balance).toFixed(2)}.`
      );
    }
    console.log("====================================\n");
  }

  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async run() {
    console.log("🏦 Welcome to Personal Budget Simulator");
    console.log("=========================================\n");
    console.log("Let's set up your monthly budget.\n");

    // Get monthly income
    let income = 0;
    while (income <= 0) {
      const incomeInput = await this.prompt(
        "What is your monthly income? (enter amount): $"
      );
      income = parseFloat(incomeInput);
      if (isNaN(income) || income <= 0) {
        console.log("Please enter a valid positive number.\n");
      }
    }
    this.setIncome(income);

    // Add sample expenses to demonstrate functionality
    console.log("\nLet's add your monthly expenses.\n");

    const expenseCategories = [
      "Rent/Mortgage",
      "Groceries",
      "Transportation",
      "Utilities",
      "Entertainment",
    ];

    for (const category of expenseCategories) {
      const expenseInput = await this.prompt(
        `How much do you spend on ${category}? ($0 to skip): $`
      );
      const expense = parseFloat(expenseInput);
      if (!isNaN(expense) && expense > 0) {
        this.addExpense(category, expense);
      }
    }

    // Display initial budget
    this.displayBudgetSummary();

    // Start conversation with Claude about the budget
    console.log("💬 Now let's discuss your budget with our AI advisor.\n");

    // Prepare initial context for Claude
    const budgetContext = `I've set up my monthly budget. 
    My income is $${this.budget.income}.
    My expenses are: ${Object.entries(this.budget.expenses)
      .map(([cat, amt]) => `${cat}: $${amt}`)
      .join(", ")}.
    What are your thoughts on my budget?`;

    const initialResponse = await this.chat(budgetContext);
    console.log(`AI Advisor: ${initialResponse}\n`);

    // Continue conversation loop
    let continueChat = true;
    while (continueChat) {
      const userInput = await this.prompt("You: ");

      if (
        userInput.toLowerCase() === "quit" ||
        userInput.toLowerCase() === "exit"
      ) {
        