
type TunerkitHeaders = {
  'Tunerkit-Session-Id'?: string;
  'Tunerkit-Session-Path'?: string;
  'Tunerkit-Session-Name'?: string;
  'Tunerkit-Record-Id'?: string;
}

type ToolOptions = {
  dev?: boolean;
  // Add any other options you want to support
};

export class TunerkitClient<T extends object> {
  private client: T;
  private tunerkitApiKey: string;
  private logger: any;

  constructor({
    client,
    tunerkitApiKey,
    logger
  }: {
    client: T;
    tunerkitApiKey: string;
    logger?: any;
  }) {
    this.client = client;
    this.tunerkitApiKey = tunerkitApiKey;
    this.logger = logger;
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) {
          return (target as any)[prop];
        }
        return this.createProxyHandler(prop as string);
      }
    }) as any;
  }

  private async _logToTunerkit(params: any, response: any, headers: TunerkitHeaders) {
    try {
      await fetch('https://api.tunerkit.dev/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tunerkitApiKey}`,
          ...headers
        },
        body: JSON.stringify({ params, response }),
      });
    } catch (error) {
      console.error('Error logging to Tunerkit:', error);
    }
  }

  private async _runDevFlow(params: any, headers: any, options: any): Promise<{ run_model: boolean; response: any }> {
    const tunerkitResponse = await fetch('https://api.tunerkit.dev/v1/dev/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.tunerkitApiKey}`,
            'Tunerkit-Session-Id': headers['Tunerkit-Session-Id'],
            "Tunerkit-Session-Path": headers["Tunerkit-Session-Path"],
            'Tunerkit-Session-Name': headers['Tunerkit-Session-Name'],
            'Tunerkit-Record-Id': headers['Tunerkit-Record-Id'],
        },
        body: JSON.stringify(params)
    });

    if (!tunerkitResponse.ok) {
        throw new Error(`Tunerkit API request failed with status ${tunerkitResponse.status}`);
    }

    const response = await tunerkitResponse.json();
    return response
  }

  public tool(options?: ToolOptions) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async (...args: any[]) => {
        const params = args[0] || {};
        const headers: TunerkitHeaders = args[1] || {};
        const toolOptions = { ...options, dev: options?.dev || false };

        let response;
        let devResponse: any = { run_model: true };

        if (toolOptions.dev) {
          devResponse = await this._runDevFlow(params, headers, toolOptions);
          response = devResponse.response;
        }

        if (devResponse.run_model) {
          response = await originalMethod.apply(this, args);
          this._logToTunerkit(params, response, headers);
        }

        if (this.logger) {
          this.logger.log({
            params,
            response,
            headers,
            meta: response.meta
          });
        }

        return response;
      };
      return descriptor;
    };
  }

  private createProxyHandler(propPath: string): any {
    return new Proxy(() => {}, {
      get: (_, subProp) => this.createProxyHandler(`${propPath}.${String(subProp)}`),
      apply: async (_, __, args) => {
        const [params, headers, options] = args;
        const method = propPath.split('.').reduce((obj: any, prop) => obj[prop], this.client);

        let response;
        let devResponse: any = {
            run_model: true,
        };

        if (options?.dev) {
            devResponse = await this._runDevFlow(params, headers, options);
            response = devResponse.response;
        }

        if (devResponse.run_model) {
            response = await method.call(this.client, params);
            this._logToTunerkit(params, response, headers);
        }

        if (this.logger) {
            this.logger.log({
                params,
                response,
                headers,
                meta: response.meta
            });
        }

        return response;
      }
    });
  }
}

export class HeliconeLogger implements TunerkitLogger {
  private heliconeApiKey: string;
  private baseURL: string;

  constructor(heliconeApiKey: string, baseURL: string) {
    this.heliconeApiKey = heliconeApiKey;
    this.baseURL = baseURL;
  }

  async log({
    params,
    response,
    headers,
    meta
  }: {
    params: any;
    response: any;
    headers: any;
    meta?: Record<string, string>;
  }): Promise<void> {
    if (!params) {
      console.error("Request is not registered.");
      return;
    }

    const endTime = Date.now();

    try {
      const providerRequest: ProviderRequest = {
        url: "custom-model-nopath",
        json: params,
        meta: meta ?? {},
      };

      const providerResponse: ProviderResponse = {
        headers: response.headers ?? {},
        status: parseInt(meta?.status ?? "200"),
        json: response,
      };

      const timing: Timing = {
        startTime: {
          seconds: Math.trunc(endTime / 1000),
          milliseconds: endTime % 1000,
        },
        endTime: {
          seconds: Math.trunc(endTime / 1000),
          milliseconds: endTime % 1000,
        },
      };

      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.heliconeApiKey}`,
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          providerRequest,
          providerResponse,
          timing,
        }),
      };

      await fetch(`${this.baseURL}/trace/log`, options);
    } catch (error: any) {
      console.error(
        "Error making request to Helicone log endpoint:",
        error?.message,
        error
      );
    }
  }
}

/*
 * Type Definitions
 *
 * */

type ProviderRequest = {
  url: string;
  json: {
    [key: string]: any;
  };
  meta: Record<string, string>;
};

type ProviderResponse = {
  json: {
    [key: string]: any;
  };
  status: number;
  headers: Record<string, string>;
};

type Timing = {
  startTime: {
    seconds: number;
    milliseconds: number;
  };
  endTime: {
    seconds: number;
    milliseconds: number;
  };
};

type TunerkitLogger = {
  log: (params: any, headers: any, options: any) => Promise<void>;
}