# L'Oréal Routine Builder

L'Oréal Routine Builder is a beginner-friendly web app that helps users explore beauty products, select items they like, and generate a personalized routine with the help of an AI chatbot.

The website is built with plain HTML, CSS, and JavaScript. It does not use any framework, so the code is easy to read and learn from.

## What the App Does

This project lets users:

- Browse a catalog of L'Oréal brand products
- Filter products by category
- Search for products by name or keyword
- Open a product description window for more details
- Select products to build a routine
- Generate an AI-powered routine
- Ask follow-up questions in the chatbot

## Main Features

### 1. OpenAI-Powered Chatbot

The chatbot uses OpenAI's API through a Cloudflare Worker. When the user clicks **Generate Routine**, the selected products are sent to the AI, which creates a routine in friendly, easy-to-follow language.

After a routine is generated, the user can continue chatting with the advisor and ask follow-up questions about the routine or beauty topics.

### 2. Product Filtering and Search

The product section helps users find the right items quickly.

- The **category filter** narrows the list to a product type such as cleanser, moisturizer, haircare, or makeup.
- The **search bar** lets users look up products by name, brand, category, or description keywords.

These two tools work together, so users can filter and search at the same time.

### 3. Product Description Modal

Each product card includes a **Description** button.

When the button is clicked, a modal window opens with:

- The product name
- The brand name
- The full product description

This gives users more detail without leaving the page or losing their place in the product list.

### 4. Chatbot Conversation Area

The chatbot is where users talk to the AI advisor.

- The conversation appears in message bubbles
- The chat window can be expanded to show more of the conversation at once
- The chat keeps the routine context in mind when answering follow-up questions

This makes the site feel more like a guided beauty assistant than a simple product list.

## How It Works

1. The app loads the product data from `products.json`.
2. The user filters or searches for products.
3. The user selects the products they want.
4. The selected products are sent to OpenAI through the worker.
5. The AI returns a routine.
6. The user can ask more questions in the chatbox.

## Project Files

- `index.html` - Page structure and app layout
- `style.css` - All visual styling
- `script.js` - Product filtering, modal behavior, selection logic, and chatbot logic
- `products.json` - Product data used by the app
- `secrets.js` - Stores the worker URL used for the OpenAI request

## OpenAI Setup

This project expects a Worker URL to be available in `secrets.js`.

The JavaScript sends a chat-completions style request using:

- `model: "gpt-4o"`
- a `messages` array

The app then reads the response and uses the assistant text to fill the chatbot.

## Learning Notes

This project is a good example of how several front-end ideas can work together:

- Reading data from a JSON file
- Filtering and searching content on the page
- Reusing a modal window for product details
- Sending selected data to an AI model
- Displaying conversation history in a chat 

## Challenges Solved

During the development of this project, a couple challenges presented themselves:

- The description window appearing upon opening the website and not closable
- The cards for the products breaking when adding the product descriptions

## Getting Started

Open the project in a browser or run it in VS Code with Live Server if available. Make sure `secrets.js` contains the correct worker URL before trying the chatbot.

## License

This project is for classroom and learning use.
