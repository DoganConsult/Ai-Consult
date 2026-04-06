/**
 * Command Palette Helpers
 *
 * Utility functions for command lookup and category filtering.
 *
 * Requirements: 6.2 - Command palette shows available commands based on user permissions
 */

import { Command, CommandCategory } from './command-palette.types';
import { COMMAND_REGISTRY } from './command-registry';

/**
 * Get command label based on language preference.
 * @param command - The command to get label for
 * @param language - Language code ('en' or 'ar')
 * @returns The localized label
 */
export function getCommandLabel(command: Command, language: 'en' | 'ar'): string {
  return language === 'ar' ? command.labelAr : command.label;
}

/**
 * Get all commands in a specific category.
 * @param category - The category to filter by
 * @returns Array of commands in the category
 */
export function getCommandsByCategory(category: CommandCategory): Command[] {
  return COMMAND_REGISTRY.filter(cmd => cmd.category === category);
}

/**
 * Get a command by its ID.
 * @param commandId - The command ID to find
 * @returns The command or undefined if not found
 */
export function getCommandById(commandId: string): Command | undefined {
  return COMMAND_REGISTRY.find(cmd => cmd.id === commandId);
}
