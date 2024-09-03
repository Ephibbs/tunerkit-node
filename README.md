# Tunerkit

Tunerkit is a powerful Node.js SDK for end-to-end development of AI agents. It provides tools for logging, monitoring, and simulating runs through your code, making it easier to develop, debug, and optimize your AI applications.

## Features

- Easy integration with existing AI clients
- Logging and monitoring of API calls
- Simulation of API responses for development and testing
- Flexible configuration options
- Integration with Helicone for advanced logging and analytics

## Installation

Install Tunerkit using npm:

```bash
npm install tunerkit
```

## Setup

To use Tunerkit, you'll need to set up a client with your Tunerkit API key. Here's a basic setup:

```typescript
import { TunerkitClient } from 'tunerkit';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your-openai-api-key',
});

const tunerkitClient = new TunerkitClient({
  client: openai,
  tunerkitApiKey: 'your-tunerkit-api-key',
});
```

## Usage

### Basic Usage

Once set up, you can use the `tunerkitClient` just like you would use your original client:

```typescript
tunerkitClient.setSession({
  sessionId: 'unique-session-id',
  sessionName: 'My Chat Session',
});

const response = await tunerkitClient.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello, how are you?" }],
});

console.log(response.choices[0].message.content);
```

### Using the Tool Decorator

Tunerkit provides a `tool` decorator for integrating Tunerkit functionality into your existing functions. Here's an example:

```typescript
import { TunerkitClient } from 'tunerkit';
import axios from 'axios';

const tunerkitClient = new TunerkitClient({
  client: {},
  tunerkitApiKey: 'your-tunerkit-api-key',
});

@tunerkitClient.tool()
async function fetchWebContent(url: string): Promise<string> {
  const response = await axios.get(url);
  return response.data;
}

// Usage
async function main() {
  tunerkitClient.setSession({
    sessionId: 'unique-fetch-session-id',
    sessionName: 'Web Content Fetch',
  });

  try {
    const html = await fetchWebContent('https://example.com');
    console.log('Fetched HTML:', html.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error fetching web content:', error);
  }
}

main();
```

### Development Mode with Tool Decorator

To use development mode with the `tool` decorator:

```typescript
@tunerkitClient.tool({ dev: true })
async function fetchWebContent(url: string): Promise<string> {
  // ... function implementation ...
}
```

### Changing Sessions

To change the session during runtime:

```typescript
tunerkitClient.setSession({
  sessionId: 'another-unique-id',
  sessionName: 'Another Task',
});

// Subsequent calls will use this new session
```

### Logging with Helicone

To use Helicone logging:

```typescript
import { HeliconeLogger } from 'tunerkit';

const heliconeLogger = new HeliconeLogger('your-helicone-api-key', 'https://api.hconeai.com');

const tunerkitClient = new TunerkitClient({
  client: openai,
  tunerkitApiKey: 'your-tunerkit-api-key',
  logger: heliconeLogger,
});
```

## Setting Up Simulations

To set up simulations of your AI workflows:

1. Host your AI workflow:

```javascript
import express from 'express';
import { registerWorkflowCall } from 'tunerkit';

const app = express();

app.use(express.json());

app.post('/ai-workflow', async (req, res) => {
  const { ...params } = req.body;

  await registerWorkflowCall(req);

  // Your AI workflow logic here
  const result = await runAIWorkflow(params);

  res.json(result);
});

app.listen(3000, () => console.log('AI workflow server running on port 3000'));
```

2. Register your webhook in your dataset at app.tunerkit.dev.


3. Run simulations from Tunerkit:

Once you've hosted your AI workflow and registered the webhook, you can run simulations directly from the Tunerkit platform:

- Log in to your Tunerkit account at app.tunerkit.dev
- Navigate to your registered dataset
- Select the workflow you want to simulate
- Click on the "Run Simulation" button
- Configure any necessary parameters for your simulation
- Start the simulation and observe the results in real-time

Tunerkit will send requests to your hosted AI workflow, allowing you to test and refine your AI application without incurring costs from actual API calls.


## API Reference

### TunerkitClient

#### Constructor

```typescript
new TunerkitClient({
  client: T,
  tunerkitApiKey: string,
  logger?: TunerkitLogger
})
```

#### Methods

- `setSession(options: { sessionId: string, sessionName: string }): void`
- `tool(options?: { dev?: boolean }): MethodDecorator`

Tunerkit also proxies all methods of the original client, adding logging and development mode capabilities.

### HeliconeLogger

#### Constructor

```typescript
new HeliconeLogger(heliconeApiKey: string, baseURL: string)
```

## Best Practices

1. Always use `setSession` to manage session information.
2. Use descriptive session names to easily identify different parts of your application.
3. Leverage development mode for testing and debugging without making actual API calls.
4. Implement proper error handling for both Tunerkit and your AI client operations.

## Contributing

We welcome contributions to Tunerkit! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

Tunerkit is released under the [MIT License](LICENSE).

## Support

For support, please open an issue on our [GitHub repository](https://github.com/your-repo/tunerkit) or contact our support team at support@tunerkit.dev.