import { Database } from '../database/connection';

export interface MigrationResult {
  migratedCount: number;
  failedCount: number;
  migrationLog: string[];
}

export interface ValidationResult {
  validationStatus: 'PASSED' | 'WARNING' | 'FAILED';
  contextualCoresCount: number;
  venturesCount: number;
  conversationsWithVentures: number;
  conversationsWithLegacy: number;
  orphanedConversations: number;
  validationDetails: string[];
}

export interface RollbackResult {
  restoredCount: number;
  rollbackLog: string[];
}

export interface MigrationStatus {
  isComplete: boolean;
  hasContextualCores: boolean;
  hasVentures: boolean;
  hasOrphanedConversations: boolean;
  migrationNeeded: boolean;
  lastMigrationDate?: Date;
}

export class MigrationService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Check the current migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    const client = await this.db.getClient();
    
    try {
      // Check if contextual_cores table exists
      const contextualCoresExist = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'contextual_cores'
        )
      `);
      
      if (!contextualCoresExist.rows[0].exists) {
        return {
          isComplete: true,
          hasContextualCores: false,
          hasVentures: true,
          hasOrphanedConversations: false,
          migrationNeeded: false
        };
      }

      // Count contextual cores
      const coresResult = await client.query('SELECT COUNT(*) as count FROM contextual_cores');
      const coresCount = parseInt(coresResult.rows[0].count);

      // Count ventures
      const venturesResult = await client.query('SELECT COUNT(*) as count FROM ventures');
      const venturesCount = parseInt(venturesResult.rows[0].count);

      // Count orphaned conversations
      const orphanedResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM conversations 
        WHERE contextual_core_id IS NOT NULL 
        AND venture_id IS NULL 
        AND legacy_contextual_core_id IS NULL
      `);
      const orphanedCount = parseInt(orphanedResult.rows[0].count);

      // Check for last migration log (we'll create a simple table for this)
      let lastMigrationDate: Date | undefined;
      try {
        const migrationLogResult = await client.query(`
          SELECT MAX(created_at) as last_migration 
          FROM migration_log 
          WHERE migration_type = 'contextual_cores_to_ventures'
        `);
        if (migrationLogResult.rows[0].last_migration) {
          lastMigrationDate = new Date(migrationLogResult.rows[0].last_migration);
        }
      } catch (error) {
        // migration_log table doesn't exist yet
      }

      return {
        isComplete: orphanedCount === 0 && coresCount === 0,
        hasContextualCores: coresCount > 0,
        hasVentures: venturesCount > 0,
        hasOrphanedConversations: orphanedCount > 0,
        migrationNeeded: orphanedCount > 0 || (coresCount > 0 && venturesCount === 0),
        lastMigrationDate
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute the migration from contextual cores to ventures
   */
  async executeMigration(): Promise<MigrationResult> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      // Create migration log table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migration_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          migration_type VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Execute the migration function
      const result = await client.query('SELECT * FROM migrate_contextual_cores_to_ventures()');
      
      if (result.rows.length === 0) {
        throw new Error('Migration function returned no results');
      }

      const migrationResult: MigrationResult = {
        migratedCount: result.rows[0].migrated_count,
        failedCount: result.rows[0].failed_count,
        migrationLog: result.rows[0].migration_log
      };

      // Log the migration
      await client.query(`
        INSERT INTO migration_log (migration_type, status, details)
        VALUES ($1, $2, $3)
      `, [
        'contextual_cores_to_ventures',
        migrationResult.failedCount === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        JSON.stringify(migrationResult)
      ]);

      await client.query('COMMIT');
      return migrationResult;

    } catch (error) {
      await client.query('ROLLBACK');
      
      // Log the failed migration
      try {
        await client.query(`
          INSERT INTO migration_log (migration_type, status, details)
          VALUES ($1, $2, $3)
        `, [
          'contextual_cores_to_ventures',
          'FAILED',
          JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
        ]);
      } catch (logError) {
        // If we can't log, just continue
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate the migration results
   */
  async validateMigration(): Promise<ValidationResult> {
    const client = await this.db.getClient();
    
    try {
      const result = await client.query('SELECT * FROM validate_migration()');
      
      if (result.rows.length === 0) {
        throw new Error('Validation function returned no results');
      }

      return {
        validationStatus: result.rows[0].validation_status as 'PASSED' | 'WARNING' | 'FAILED',
        contextualCoresCount: result.rows[0].contextual_cores_count,
        venturesCount: result.rows[0].ventures_count,
        conversationsWithVentures: result.rows[0].conversations_with_ventures,
        conversationsWithLegacy: result.rows[0].conversations_with_legacy,
        orphanedConversations: result.rows[0].orphaned_conversations,
        validationDetails: result.rows[0].validation_details
      };
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the migration (emergency use only)
   */
  async rollbackMigration(): Promise<RollbackResult> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      const result = await client.query('SELECT * FROM rollback_venture_migration()');
      
      if (result.rows.length === 0) {
        throw new Error('Rollback function returned no results');
      }

      const rollbackResult: RollbackResult = {
        restoredCount: result.rows[0].restored_count,
        rollbackLog: result.rows[0].rollback_log
      };

      // Log the rollback
      await client.query(`
        INSERT INTO migration_log (migration_type, status, details)
        VALUES ($1, $2, $3)
      `, [
        'venture_migration_rollback',
        'SUCCESS',
        JSON.stringify(rollbackResult)
      ]);

      await client.query('COMMIT');
      return rollbackResult;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<Array<{
    id: string;
    migrationType: string;
    status: string;
    details: any;
    createdAt: Date;
  }>> {
    const client = await this.db.getClient();
    
    try {
      const result = await client.query(`
        SELECT id, migration_type, status, details, created_at
        FROM migration_log
        ORDER BY created_at DESC
        LIMIT 20
      `);

      return result.rows.map(row => ({
        id: row.id,
        migrationType: row.migration_type,
        status: row.status,
        details: row.details,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      // If migration_log doesn't exist, return empty array
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Create a backup of contextual cores before migration
   */
  async createBackup(): Promise<{ backupCreated: boolean; backupPath?: string }> {
    const client = await this.db.getClient();
    
    try {
      // Create a backup table
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupTableName = `contextual_cores_backup_${timestamp}`;

      await client.query(`
        CREATE TABLE ${backupTableName} AS 
        SELECT * FROM contextual_cores
      `);

      // Also backup related conversations
      const conversationBackupTable = `conversations_backup_${timestamp}`;
      await client.query(`
        CREATE TABLE ${conversationBackupTable} AS 
        SELECT * FROM conversations 
        WHERE contextual_core_id IS NOT NULL
      `);

      return {
        backupCreated: true,
        backupPath: `${backupTableName}, ${conversationBackupTable}`
      };
    } catch (error) {
      return {
        backupCreated: false
      };
    } finally {
      client.release();
    }
  }

  /**
   * Clean up old contextual cores after successful migration
   */
  async cleanupOldData(): Promise<{ deletedCores: number; deletedConversations: number }> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      // First, ensure all conversations have been migrated
      const orphanedCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM conversations 
        WHERE contextual_core_id IS NOT NULL 
        AND venture_id IS NULL 
        AND legacy_contextual_core_id IS NULL
      `);

      if (parseInt(orphanedCheck.rows[0].count) > 0) {
        throw new Error('Cannot clean up: orphaned conversations still exist');
      }

      // Delete contextual cores that have corresponding ventures
      const deleteCoresResult = await client.query(`
        DELETE FROM contextual_cores 
        WHERE id IN (
          SELECT legacy_contextual_core_id 
          FROM conversations 
          WHERE legacy_contextual_core_id IS NOT NULL
        )
      `);

      // Clear legacy references from conversations (optional)
      const clearLegacyResult = await client.query(`
        UPDATE conversations 
        SET 
          contextual_core_id = NULL,
          legacy_contextual_core_id = NULL 
        WHERE legacy_contextual_core_id IS NOT NULL
      `);

      await client.query('COMMIT');

      return {
        deletedCores: deleteCoresResult.rowCount || 0,
        deletedConversations: clearLegacyResult.rowCount || 0
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}