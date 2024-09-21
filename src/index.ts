import { v4 as uuidv4 } from 'uuid';

type TunerkitHeaders = {
  'Tunerkit-Session-Id'?: string | undefined;
  'Tunerkit-Session-Path'?: string | undefined;
  'Tunerkit-Dataset-Id'?: string | undefined;
  'Tunerkit-Record-Id'?: string | undefined;
  'Tunerkit-Session-Type'?: string | undefined;
  'Tunerkit-Session-Parent-Id'?: string | undefined;
}

type ToolOptions = {
  dev?: boolean;
  // Add any other options you want to support
};

export class TunerkitClient<T extends object> {
  private client: T;
  private tunerkitApiKey: string;
  private logger: any;
  private baseURL: string;
  private datasetId: string;
  private sessionType: string;
  private sessionId: string;
  private recordId: string;
  private sessionParentId: string;
  [key: string]: any; // Add this index signature

  constructor({
    client,
    tunerkitApiKey,
    logger,
    baseURL='https://api.tunerkit.dev'
  }: {
    client: T;
    tunerkitApiKey: string;
    logger?: any;
    baseURL: string;
  }) {
    this.client = client;
    this.tunerkitApiKey = tunerkitApiKey;
    this.logger = logger;
    this.baseURL = baseURL;
    this.sessionType = 'real';
    this.sessionId = '';
    this.recordId = '';
    this.sessionParentId = '';
    this.datasetId = '';
    const self = this; // Capture the instance

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) {
          return (target as any)[prop];
        }
        return self.createProxyHandler(prop as string); // Use 'self' instead of 'this'
      }
    }) as any;
  }

  private async _logToTunerkit(request: any, response: any, timing: any, headers: TunerkitHeaders) {
    try {
      const cleanedHeaders = Object.fromEntries(
        Object.entries(headers).filter(([_, value]) => value !== undefined)
      );

      await fetch(`${this.baseURL}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tunerkitApiKey}`,
          ...cleanedHeaders
        },
        body: JSON.stringify({ request, response, timing }),
      });
    } catch (error) {
      console.error('Error logging to Tunerkit:', error);
    }
  }

  private async _runDevFlow(params: any, headers: any): Promise<{ run_model: boolean; response: any }> {
    const tunerkitResponse = await fetch(`${this.baseURL}/api/completions`, {
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
          devResponse = await this._runDevFlow(params, headers);
          response = devResponse.response;
        }

        if (devResponse.run_model) {
          const startTime = Date.now();
          response = await originalMethod.apply(this, args);
          const endTime = Date.now();
          const timing: Timing = {
            startTime: {
              seconds: Math.trunc(startTime / 1000),
              milliseconds: startTime % 1000,
            },
            endTime: {
              seconds: Math.trunc(endTime / 1000),
              milliseconds: endTime % 1000,
            },
          };
          this._logToTunerkit(params, response, timing, headers);
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

  public startSession({ inputs, datasetId, recordId, sessionId, parentId, type='real' }: { inputs: any, datasetId: string, recordId?: string, sessionId?: string, parentId?: string, type?: string }) {
    recordId = recordId || uuidv4();
    sessionId = sessionId || uuidv4();
    this.datasetId = datasetId;
    this.sessionId = sessionId;
    this.recordId = recordId;
    this.sessionType = type;
    const headers: TunerkitHeaders = {
      'Tunerkit-Dataset-Id': datasetId,
      'Tunerkit-Record-Id': recordId,
      'Tunerkit-Session-Id': sessionId,
      'Tunerkit-Session-Type': type,
      'Tunerkit-Session-Parent-Id': parentId
    };

    const startTime = Date.now();

    this._logToTunerkit({
      inputs
    }, {}, {startTime: {
      seconds: Math.trunc(startTime / 1000),
      milliseconds: startTime % 1000,
    },
    endTime: {
      seconds: Math.trunc(startTime / 1000),
      milliseconds: startTime % 1000,
    }
  }, {...headers, 'Tunerkit-Session-Path': '__START__'});

    return headers;
  }

  public endSession({outputs, headers}: {outputs?: any, headers: TunerkitHeaders}) {
    const endTime = Date.now();
    this._logToTunerkit({outputs}, {}, {
      startTime: {
        seconds: Math.trunc(endTime / 1000),
        milliseconds: endTime % 1000,
      },
      endTime: {
        seconds: Math.trunc(endTime / 1000),
        milliseconds: endTime % 1000,
      },
    }, {...headers, 'Tunerkit-Session-Path': '__END__'});
  }

  private createProxyHandler(propPath: string): any {
    const self = this; // Capture the instance
    return new Proxy(() => {}, {
      get: (_, subProp) => self.createProxyHandler(`${propPath}.${String(subProp)}`),
      apply: async (_, __, args) => {
        const [params] = args;
        const headers = {
          'Tunerkit-Dataset-Id': self.datasetId,
          'Tunerkit-Session-Id': self.sessionId,
          'Tunerkit-Record-Id': self.recordId,
          'Tunerkit-Session-Type': self.sessionType,
          'Tunerkit-Session-Parent-Id': self.sessionParentId
        }
        console.log("headers", headers);
        const isDev = self.sessionType === 'test';
        // Use a type-safe approach to access the method
        const method = propPath.split('.').reduce<any>((obj, prop) => {
          if (obj && typeof obj === 'object' && prop in obj) {
            return obj[prop];
          }
          return undefined;
        }, self.client);

        if (typeof method !== 'function') {
          throw new Error(`Method ${propPath} not found on client`);
        }

        let response;
        let devResponse: any = {
            run_model: true,
        };

        let startTime = Date.now();
        let endTime = Date.now();

        if (isDev) {
            devResponse = await self._runDevFlow(params, headers);
            response = devResponse.response;
        }

        if (devResponse.run_model) {
            const methodParts = propPath.split('.');
            const methodName = methodParts.pop()!;
            const methodObject = methodParts.reduce<any>((obj, prop) => obj[prop], self.client);
            
            if (typeof methodObject[methodName] !== 'function') {
              throw new Error(`Method ${propPath} not found on client`);
            }
        
            startTime = Date.now();
            if (params.stream) {
                const stream = await methodObject[methodName](params);
                let fullResponse = '';
                response = await new Promise((resolve) => {
                    stream.on('data', (chunk: any) => {
                        fullResponse += chunk.toString();
                    });
                    stream.on('end', () => {
                        endTime = Date.now();
                        const response = JSON.parse(fullResponse);
                        resolve(response);
                        const timing: Timing = {
                            startTime: {
                              seconds: Math.trunc(startTime / 1000),
                              milliseconds: startTime % 1000,
                            },
                            endTime: {
                              seconds: Math.trunc(endTime / 1000),
                              milliseconds: endTime % 1000,
                            },
                        };
                        self._logToTunerkit(params, response, timing, headers);
                    });
                });
            } else {
                response = await methodObject[methodName](params);
                endTime = Date.now();
                const timing: Timing = {
                  startTime: {
                    seconds: Math.trunc(startTime / 1000),
                    milliseconds: startTime % 1000,
                  },
                  endTime: {
                    seconds: Math.trunc(endTime / 1000),
                    milliseconds: endTime % 1000,
                  },
                };
                self._logToTunerkit(params, response, timing, headers);
            }
        }

        if (self.logger) {
            self.logger.log({
                params,
                response,
                headers,
                meta: response.meta,
                startTime,
                endTime
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
    meta,
    startTime,
    endTime
  }: {
    params: any;
    response: any;
    headers: any;
    meta?: Record<string, string>;
    startTime: number;
    endTime: number;
  }): Promise<void> {
    if (!params) {
      console.error("Request is not registered.");
      return;
    }

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
          seconds: Math.trunc(startTime / 1000),
          milliseconds: startTime % 1000,
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