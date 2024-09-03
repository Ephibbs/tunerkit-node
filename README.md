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
const response = await tunerkitClient.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello, how are you?" }],
}, {
  'Tunerkit-Session-Id': 'unique-session-id',
  'Tunerkit-Session-Name': 'My Chat Session',
});

console.log(response.choices[0].message.content);
```

### Development Mode

Tunerkit provides a development mode that allows you to simulate API responses:

```typescript
const devResponse = await tunerkitClient.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello, how are you?" }],
}, {
  'Tunerkit-Session-Id': 'unique-session-id',
  'Tunerkit-Session-Name': 'My Chat Session',
}, {
  dev: true
});

console.log(devResponse.choices[0].message.content);
```

### Logging with Helicone

Tunerkit integrates with Helicone for advanced logging and analytics. To use Helicone logging:

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

Tunerkit allows you to set up simulations of your AI workflows or agents, which is particularly useful for development and testing. To use this feature, you need to host your AI workflow or agent at an endpoint that Tunerkit can call. Here's how to set it up:

### 1. Host Your AI Workflow

Create an endpoint that hosts your AI workflow or agent. This endpoint should:

- Accept HTTP POST requests
- Take a JSON body with any initial parameters your AI workflow needs
- Include a `dev` flag in the function parameters

Here's an example of how your endpoint might look using Express.js with ES6 imports:

```javascript
import express from 'express';

const app = express();

app.use(express.json());

app.post('/ai-workflow', async (req, res) => {
  const { dev, ...params } = req.body;

  // Your AI workflow logic here
  const result = await runAIWorkflow(params, dev);

  res.json(result);
});

function runAIWorkflow(params, dev) {
  if (dev) {
    // Return simulated data for development
    return {
      result: "Simulated AI response",
      metadata: {
        simulated: true,
        params: params
      }
    };
  } else {
    // Run the actual AI workflow
    // ... your AI logic here ...
  }
}

app.listen(3000, () => console.log('AI workflow server running on port 3000'));
```

### 2. Register Your Webhook

To use simulations with Tunerkit, you need to register your AI workflow webhook in your dataset at app.tunerkit.dev. This allows Tunerkit to call your hosted endpoint for simulations. Here's how to set it up:

1. Log in to your Tunerkit account at app.tunerkit.dev
2. Navigate to your dataset settings
3. Find the "Webhooks" section
4. Add a new webhook with the URL of your hosted AI workflow (e.g., 'http://your-server.com/ai-workflow')
5. Save your changes

After registering your webhook, you can use it in your Tunerkit configuration:

### 3. Use Development Mode

Now, when you want to run a simulation, you can use the development mode flag:

```typescript
const simulatedResponse = await tunerkitClient.runWorkflow({
  input: "Hello, AI!",
  otherParams: "..."
}, {
  'Tunerkit-Session-Id': 'unique-session-id',
  'Tunerkit-Session-Name': 'Simulation Test',
}, {
  dev: true
});

console.log(simulatedResponse);
```

In this mode, Tunerkit will call your hosted endpoint with the `dev` flag set to `true`, allowing your workflow to return simulated data.

### 4. Customize Simulations

You can customize your simulations by adding more logic to your `runAIWorkflow` function. For example, you might:

- Return different simulated responses based on input parameters
- Introduce artificial delays to simulate processing time
- Simulate error conditions to test error handling

### Best Practices for Simulations

1. Make your simulated responses as close to real responses as possible.
2. Use environment variables or configuration files to easily switch between development and production endpoints.
3. Include metadata in your simulated responses to clearly indicate they are simulations.
4. Test both your simulated and real workflows regularly to ensure consistency.

By setting up simulations, you can develop and test your AI-powered applications more efficiently, without constantly hitting production AI services.


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

- `client`: Your AI client (e.g., OpenAI instance)
- `tunerkitApiKey`: Your Tunerkit API key
- `logger`: (Optional) A custom logger implementing the `TunerkitLogger` interface

#### Methods

Tunerkit proxies all methods of the original client, adding logging and development mode capabilities.

### HeliconeLogger

#### Constructor

```typescript
new HeliconeLogger(heliconeApiKey: string, baseURL: string)
```

- `heliconeApiKey`: Your Helicone API key
- `baseURL`: Helicone API base URL

## Best Practices

1. Always use unique session IDs for each conversation or task.
2. Use descriptive session names to easily identify different parts of your application.
3. Leverage development mode for testing and debugging without making actual API calls.
4. Implement proper error handling for both Tunerkit and your AI client operations.

## Contributing

We welcome contributions to Tunerkit! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

Tunerkit is released under the [MIT License](LICENSE).

## Support

For support, please open an issue on our [GitHub repository](https://github.com/your-repo/tunerkit) or contact our support team at support@tunerkit.dev.