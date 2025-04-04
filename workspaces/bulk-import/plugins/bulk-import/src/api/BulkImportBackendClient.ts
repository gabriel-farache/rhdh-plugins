/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ConfigApi,
  createApiRef,
  IdentityApi,
} from '@backstage/core-plugin-api';

import {
  AddedRepositoryColumnNameEnum,
  APITypes,
  CreateImportJobRepository,
  ImportJobResponse,
  ImportJobs,
  ImportJobStatus,
  OrgAndRepoResponse,
  SortingOrderEnum,
} from '../types';
import { getApi } from '../utils/repository-utils';

// @public
export type BulkImportAPI = {
  dataFetcher: (
    page: number,
    size: number,
    searchString: string,
    options?: APITypes,
  ) => Promise<OrgAndRepoResponse>;
  getImportJobs: (
    page: number,
    size: number,
    searchString: string,
    sortColumn: AddedRepositoryColumnNameEnum,
    sortOrder: SortingOrderEnum,
  ) => Promise<ImportJobs | Response>;
  createImportJobs: (
    importRepositories: CreateImportJobRepository[],
    dryRun?: boolean,
  ) => Promise<ImportJobResponse[]>;
  deleteImportAction: (
    repo: string,
    defaultBranch: string,
  ) => Promise<ImportJobStatus | Response>;
  getImportAction: (
    repo: string,
    defaultBranch: string,
  ) => Promise<ImportJobStatus | Response>;
};

export type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

// @public
export const bulkImportApiRef = createApiRef<BulkImportAPI>({
  id: 'plugin.bulk-import.service',
});

export class BulkImportBackendClient implements BulkImportAPI {
  // @ts-ignore
  private readonly configApi: ConfigApi;
  private readonly identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  async dataFetcher(
    page: number,
    size: number,
    searchString: string,
    options?: APITypes,
  ) {
    const { token: idToken } = await this.identityApi.getCredentials();
    const backendUrl = this.configApi.getString('backend.baseUrl');
    const jsonResponse = await fetch(
      getApi(backendUrl, page, size, searchString, options),
      {
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
    if (jsonResponse.status !== 200 && jsonResponse.status !== 204) {
      return jsonResponse;
    }
    return jsonResponse.json();
  }

  async getImportJobs(
    page: number,
    size: number,
    searchString: string,
    sortColumn: AddedRepositoryColumnNameEnum,
    sortOrder: SortingOrderEnum,
  ) {
    const { token: idToken } = await this.identityApi.getCredentials();
    const backendUrl = this.configApi.getString('backend.baseUrl');
    const jsonResponse = await fetch(
      `${backendUrl}/api/bulk-import/imports?page=${page}&size=${size}&search=${searchString}&sortColumn=${sortColumn}&sortOrder=${sortOrder}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
          'api-version': 'v2',
        },
      },
    );
    if (!jsonResponse.ok) {
      return jsonResponse;
    }
    return jsonResponse.status === 204 ? null : jsonResponse.json();
  }

  async createImportJobs(
    importRepositories: CreateImportJobRepository[],
    dryRun?: boolean,
  ) {
    const { token: idToken } = await this.identityApi.getCredentials();
    const backendUrl = this.configApi.getString('backend.baseUrl');
    const jsonResponse = await fetch(
      dryRun
        ? `${backendUrl}/api/bulk-import/imports?dryRun=true`
        : `${backendUrl}/api/bulk-import/imports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
        body: JSON.stringify(importRepositories),
      },
    );
    if (!jsonResponse.ok) {
      const errorResponse = await jsonResponse.json();
      throw errorResponse;
    }
    return jsonResponse.status === 204 ? null : await jsonResponse.json();
  }

  async deleteImportAction(repo: string, defaultBranch: string) {
    const { token: idToken } = await this.identityApi.getCredentials();
    const backendUrl = this.configApi.getString('backend.baseUrl');
    const jsonResponse = await fetch(
      `${backendUrl}/api/bulk-import/import/by-repo?repo=${repo}&defaultBranch=${defaultBranch}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
    if (!jsonResponse.ok) {
      const errorResponse = await jsonResponse.json();
      throw errorResponse.err;
    }
    return jsonResponse.status === 204 ? null : await jsonResponse.json();
  }

  async getImportAction(repo: string, defaultBranch: string) {
    const { token: idToken } = await this.identityApi.getCredentials();
    const backendUrl = this.configApi.getString('backend.baseUrl');
    const jsonResponse = await fetch(
      `${backendUrl}/api/bulk-import/import/by-repo?repo=${repo}&defaultBranch=${defaultBranch}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
    if (jsonResponse.status !== 200 && jsonResponse.status !== 204) {
      return jsonResponse;
    }
    return jsonResponse.json();
  }
}
