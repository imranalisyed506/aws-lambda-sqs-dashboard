import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationsComponent } from './shared/notification/notification.component';
import { NotificationService } from './shared/notification/notification.service';

type ModelOptions = Record<string, string[]>;

type QueryResponse = {
  question: string;
  topK: number;
  llm: {
    provider: string;
    model: string | null;
    allowCustomModel?: boolean;
  };
  answer: string;
  confidence: string;
  citations: Array<{
    source: string;
    section: string | null;
    page: number | null;
    score: number;
  }>;
};

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, NotificationsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  apiBase = '/api';
  ingestSourceType: 'local' | 'web' = 'local';
  sourceDirs = './sample-data/docs,./sample-data/repo,./sample-data/help-site';
  helpUrls = '';
  question = 'How do I configure authentication?';
  topK = 5;
  sourceType = '';
  llmProvider = 'none';
  llmModel = '';
  allowCustomModel = false;
  temperature = 0.2;
  maxTokens = 500;
  vectorDbProvider = 'qdrant';

  healthStatus = 'Unknown';
  loading = false;
  modelOptions: ModelOptions = {};
  ingestResult = '';
  queryResult: QueryResponse | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly notifications: NotificationService
  ) {}

  get providerList(): string[] {
    return Object.keys(this.modelOptions);
  }

  get modelList(): string[] {
    return this.modelOptions[this.llmProvider] ?? [];
  }

  async ngOnInit(): Promise<void> {
    await this.loadModelOptions();
    await this.checkHealth();
  }

  async checkHealth(): Promise<void> {
    try {
      await firstValueFrom(this.http.get(this.url('/health')));
      this.healthStatus = 'Online';
      this.notifications.notifySuccess('Backend connection is healthy.');
    } catch (_error) {
      this.healthStatus = 'Offline';
      this.notifications.notifyError(
        'Backend is not reachable. Start API with npm start in ragdemo.'
      );
    }
  }

  async loadModelOptions(): Promise<void> {
    try {
      this.modelOptions = await firstValueFrom(this.http.get<ModelOptions>(this.url('/model-options')));
      if (!this.modelOptions[this.llmProvider]) {
        this.llmProvider = this.providerList[0] ?? 'none';
      }
      if (!this.allowCustomModel) {
        this.llmModel = this.modelList[0] ?? '';
      }
      this.notifications.notifySuccess('Model providers refreshed.');
    } catch (_error) {
      this.modelOptions = {
        none: [],
        ollama: ['llama3.1:8b', 'qwen2.5:7b', 'mistral:7b-instruct'],
        openrouter: ['meta-llama/llama-3.1-8b-instruct'],
        groq: ['llama-3.1-8b-instant'],
        together: ['meta-llama/Llama-3.1-8B-Instruct-Turbo'],
        openai: ['gpt-4.1-mini']
      };
      this.notifications.notifyError('Failed to load model providers from API.');
    }
  }

  onProviderChange(): void {
    if (!this.allowCustomModel) {
      this.llmModel = this.modelList[0] ?? '';
    }
  }

  async ingest(): Promise<void> {
    this.loading = true;
    this.ingestResult = '';

    const payload: any = {
      vectorDbProvider: this.vectorDbProvider
    };

    if (this.ingestSourceType === 'local') {
      const sourceDirs = this.sourceDirs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      
      if (sourceDirs.length === 0) {
        this.notifications.notifyError('Please provide at least one source directory.');
        this.loading = false;
        return;
      }
      
      payload.sourceDirs = sourceDirs;
    } else {
      const helpUrls = this.helpUrls
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      
      if (helpUrls.length === 0) {
        this.notifications.notifyError('Please provide at least one website URL.');
        this.loading = false;
        return;
      }
      
      payload.helpUrls = helpUrls;
    }

    try {
      const response = await firstValueFrom(
        this.http.post(this.url('/ingest'), payload)
      );

      this.ingestResult = JSON.stringify(response, null, 2);
      this.notifications.notifySuccess('Ingestion completed successfully.');
    } catch (error: any) {
      this.notifications.notifyError(
        error?.error?.error || error?.message || 'Ingest request failed.'
      );
    } finally {
      this.loading = false;
    }
  }

  async query(): Promise<void> {
    this.loading = true;
    this.queryResult = null;

    try {
      this.queryResult = await firstValueFrom(
        this.http.post<QueryResponse>(this.url('/query'), {
          question: this.question,
          topK: this.topK,
          filters: {
            sourceType: this.sourceType || undefined
          },
          llm: {
            provider: this.llmProvider,
            model: this.llmModel || undefined,
            allowCustomModel: this.allowCustomModel,
            temperature: this.temperature,
            maxTokens: this.maxTokens
          },
          vectorDbProvider: this.vectorDbProvider
        })
      );
      this.notifications.notifySuccess('Query completed.');
    } catch (error: any) {
      this.notifications.notifyError(
        error?.error?.error || error?.message || 'Query request failed.'
      );
    } finally {
      this.loading = false;
    }
  }

  private url(path: string): string {
    return `${this.apiBase.replace(/\/$/, '')}${path}`;
  }
}
