/**
 * tools/fix-dependencies.js
 * Tool for automatically fixing invalid task dependencies
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from './utils.js';
import { fixDependenciesDirect } from '../core/task-master-core.js';
import { findTasksJsonPath } from '../core/utils/path-utils.js';

/**
 * Register the fixDependencies tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerFixDependenciesTool(server) {
	server.addTool({
		name: 'fix_dependencies',
		description: 'Fix invalid dependencies in tasks automatically',
		parameters: z.object({
			file: z.string().optional().describe('Absolute path to the tasks file'),
			projectRoot: z
				.string()
				.optional()
				.describe(
					'Root directory of the project (default: current working directory)'
				)
		}),
		execute: async (args, { log, session, reportProgress }) => {
			try {
				log.info(`Fixing dependencies with args: ${JSON.stringify(args)}`);
				await reportProgress({ progress: 0 });

				let rootFolder = getProjectRootFromSession(session, log);

				if (!rootFolder && args.projectRoot) {
					rootFolder = args.projectRoot;
					log.info(`Using project root from args as fallback: ${rootFolder}`);
				}

				if (!rootFolder) {
					return createErrorResponse(
						'Could not determine project root. Please provide it explicitly or ensure your session contains valid root information.'
					);
				}

				let tasksJsonPath;
				try {
					tasksJsonPath = findTasksJsonPath(
						{ projectRoot: rootFolder, file: args.file },
						log
					);
				} catch (error) {
					log.error(`Error finding tasks.json: ${error.message}`);
					return createErrorResponse(
						`Failed to find tasks.json: ${error.message}`
					);
				}

				const result = await fixDependenciesDirect(
					{
						tasksJsonPath: tasksJsonPath
					},
					log
				);

				await reportProgress({ progress: 100 });

				if (result.success) {
					log.info(`Successfully fixed dependencies: ${result.data.message}`);
				} else {
					log.error(`Failed to fix dependencies: ${result.error.message}`);
				}

				return handleApiResult(result, log, 'Error fixing dependencies');
			} catch (error) {
				log.error(`Error in fixDependencies tool: ${error.message}`);
				return createErrorResponse(error.message);
			}
		}
	});
}
