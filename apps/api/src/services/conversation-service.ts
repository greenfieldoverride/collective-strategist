import { Database } from '../database/connection';
import { 
  Conversation, 
  Message, 
  ConversationTag, 
  MessageRecommendation,
  MessageAttachment,
  UserConsultantPreferences,
  CreateConversationRequest,
  UpdateConversationRequest,
  GetConversationsRequest,
  SendMessageRequest,
  ConversationStatsResponse
} from '../types/collective-strategist';
import { v4 as uuidv4 } from 'uuid';

export class ConversationService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Create a new conversation
  async createConversation(userId: string, request: CreateConversationRequest): Promise<Conversation> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const conversationId = uuidv4();
      
      // Insert conversation
      const conversationResult = await client.query(
        `INSERT INTO conversations 
         (id, user_id, contextual_core_id, title, session_type) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [conversationId, userId, request.contextualCoreId, request.title, request.sessionType]
      );
      
      // Add tags if provided
      if (request.tags && request.tags.length > 0) {
        for (const tagName of request.tags) {
          await client.query(
            `INSERT INTO conversation_tags (conversation_id, tag_name) 
             VALUES ($1, $2) ON CONFLICT (conversation_id, tag_name) DO NOTHING`,
            [conversationId, tagName]
          );
        }
      }
      
      await client.query('COMMIT');
      
      return this.mapConversationRow(conversationResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get conversations for a user
  async getConversations(userId: string, request: GetConversationsRequest): Promise<{
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
  }> {
    const client = await this.db.getClient();
    
    try {
      let whereClause = 'WHERE c.user_id = $1 AND c.status != $2';
      let params: any[] = [userId, 'deleted'];
      let paramIndex = 3;

      // Add filters
      if (request.sessionType) {
        whereClause += ` AND c.session_type = $${paramIndex}`;
        params.push(request.sessionType);
        paramIndex++;
      }

      if (request.status) {
        whereClause = whereClause.replace('c.status != $2', `c.status = $2`);
        params[1] = request.status;
      }

      if (request.search) {
        whereClause += ` AND (c.title ILIKE $${paramIndex} OR EXISTS (
          SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content ILIKE $${paramIndex}
        ))`;
        params.push(`%${request.search}%`);
        paramIndex++;
      }

      if (request.tags && request.tags.length > 0) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM conversation_tags ct 
          WHERE ct.conversation_id = c.id AND ct.tag_name = ANY($${paramIndex})
        )`;
        params.push(request.tags);
        paramIndex++;
      }

      // Sort clause
      const sortBy = request.sortBy || 'updatedAt';
      const sortOrder = request.sortOrder || 'desc';
      const orderClause = `ORDER BY c.${sortBy} ${sortOrder}`;

      // Pagination
      const limit = request.limit || 20;
      const offset = request.offset || 0;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM conversations c 
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get conversations with tags
      const conversationsQuery = `
        SELECT 
          c.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ct.id,
                'tagName', ct.tag_name,
                'tagColor', ct.tag_color,
                'createdAt', ct.created_at
              ) ORDER BY ct.tag_name
            ) FILTER (WHERE ct.id IS NOT NULL),
            '[]'::json
          ) as tags
        FROM conversations c
        LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
        ${whereClause}
        GROUP BY c.id
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      const result = await client.query(conversationsQuery, params);
      
      const conversations = result.rows.map(row => ({
        ...this.mapConversationRow(row),
        tags: row.tags || []
      }));

      return {
        conversations,
        total,
        hasMore: offset + limit < total
      };
    } finally {
      client.release();
    }
  }

  // Get a single conversation with messages
  async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    const client = await this.db.getClient();
    
    try {
      // Get conversation with tags and messages
      const result = await client.query(`
        SELECT 
          c.*,
          COALESCE(
            JSON_AGG(
              DISTINCT JSON_BUILD_OBJECT(
                'id', ct.id,
                'tagName', ct.tag_name,
                'tagColor', ct.tag_color,
                'createdAt', ct.created_at
              ) ORDER BY JSON_BUILD_OBJECT('id', ct.id, 'tagName', ct.tag_name, 'tagColor', ct.tag_color, 'createdAt', ct.created_at)
            ) FILTER (WHERE ct.id IS NOT NULL),
            '[]'::json
          ) as tags,
          COALESCE(
            JSON_AGG(
              DISTINCT JSON_BUILD_OBJECT(
                'id', m.id,
                'messageType', m.message_type,
                'content', m.content,
                'queryText', m.query_text,
                'confidenceScore', m.confidence_score,
                'processingTimeMs', m.processing_time_ms,
                'aiProvider', m.ai_provider,
                'aiModel', m.ai_model,
                'tokenUsage', m.token_usage,
                'metadata', m.metadata,
                'createdAt', m.created_at,
                'positionInConversation', m.position_in_conversation
              ) ORDER BY m.position_in_conversation
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) as messages
        FROM conversations c
        LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.id = $1 AND c.user_id = $2 AND c.status != 'deleted'
        GROUP BY c.id
      `, [conversationId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...this.mapConversationRow(row),
        tags: row.tags || [],
        messages: row.messages || []
      };
    } finally {
      client.release();
    }
  }

  // Update a conversation
  async updateConversation(
    userId: string, 
    conversationId: string, 
    request: UpdateConversationRequest
  ): Promise<Conversation | null> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update conversation
      const updateFields: string[] = [];
      const params: any[] = [conversationId, userId];
      let paramIndex = 3;

      if (request.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        params.push(request.title);
        paramIndex++;
      }

      if (request.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(request.status);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE conversations 
          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND user_id = $2 
          RETURNING *
        `;
        await client.query(updateQuery, params);
      }

      // Update tags if provided
      if (request.tags !== undefined) {
        // Delete existing tags
        await client.query(
          'DELETE FROM conversation_tags WHERE conversation_id = $1',
          [conversationId]
        );
        
        // Insert new tags
        for (const tagName of request.tags) {
          await client.query(
            `INSERT INTO conversation_tags (conversation_id, tag_name) 
             VALUES ($1, $2)`,
            [conversationId, tagName]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return updated conversation
      return await this.getConversation(userId, conversationId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Add a message to a conversation
  async addMessage(userId: string, request: SendMessageRequest): Promise<Message> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Verify conversation ownership
      const conversationResult = await client.query(
        'SELECT user_id FROM conversations WHERE id = $1 AND status = $2',
        [request.conversationId, 'active']
      );
      
      if (conversationResult.rows.length === 0 || conversationResult.rows[0].user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      // Get next position in conversation
      const positionResult = await client.query(
        'SELECT COALESCE(MAX(position_in_conversation), 0) + 1 as next_position FROM messages WHERE conversation_id = $1',
        [request.conversationId]
      );
      const nextPosition = positionResult.rows[0].next_position;

      const messageId = uuidv4();
      
      // Insert message
      const messageResult = await client.query(`
        INSERT INTO messages 
        (id, conversation_id, message_type, content, position_in_conversation) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [messageId, request.conversationId, request.messageType, request.content, nextPosition]);

      // Add attachments if provided
      if (request.attachments && request.attachments.length > 0) {
        for (const attachment of request.attachments) {
          await client.query(`
            INSERT INTO message_attachments 
            (message_id, attachment_type, filename, metadata) 
            VALUES ($1, $2, $3, $4)
          `, [messageId, attachment.attachmentType, attachment.filename, attachment.metadata]);
        }
      }
      
      await client.query('COMMIT');
      
      return this.mapMessageRow(messageResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get conversation statistics for a user
  async getConversationStats(userId: string): Promise<ConversationStatsResponse> {
    const client = await this.db.getClient();
    
    try {
      // Get basic stats
      const basicStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(*) FILTER (WHERE status = 'active') as active_conversations,
          COUNT(*) FILTER (WHERE status = 'archived') as archived_conversations,
          AVG(total_messages) as avg_messages_per_conversation,
          SUM(total_messages) as total_messages
        FROM conversations 
        WHERE user_id = $1 AND status != 'deleted'
      `, [userId]);

      // Get session type distribution
      const sessionTypeResult = await client.query(`
        SELECT session_type, COUNT(*) as count
        FROM conversations 
        WHERE user_id = $1 AND status != 'deleted'
        GROUP BY session_type
        ORDER BY count DESC
      `, [userId]);

      // Get most used session type
      const mostUsedSessionType = sessionTypeResult.rows[0]?.session_type || 'strategic_advice';

      // Get conversations by session type
      const conversationsBySessionType: Record<string, number> = {};
      sessionTypeResult.rows.forEach(row => {
        conversationsBySessionType[row.session_type] = parseInt(row.count);
      });

      // Get daily activity for last 30 days
      const dailyActivityResult = await client.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(DISTINCT c.id) as conversations,
          COALESCE(SUM(c.total_messages), 0) as messages
        FROM conversations c
        WHERE c.user_id = $1 
          AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND c.status != 'deleted'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [userId]);

      const dailyActivity = dailyActivityResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        conversations: parseInt(row.conversations),
        messages: parseInt(row.messages)
      }));

      // Get AI metrics
      const aiStatsResult = await client.query(`
        SELECT 
          AVG(confidence_score) as avg_confidence_score,
          SUM((token_usage->>'totalTokens')::int) as total_tokens_used
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = $1 
          AND m.message_type = 'ai' 
          AND m.confidence_score IS NOT NULL
          AND c.status != 'deleted'
      `, [userId]);

      const basicStats = basicStatsResult.rows[0];
      const aiStats = aiStatsResult.rows[0];

      return {
        totalConversations: parseInt(basicStats.total_conversations),
        activeConversations: parseInt(basicStats.active_conversations),
        archivedConversations: parseInt(basicStats.archived_conversations),
        totalMessages: parseInt(basicStats.total_messages) || 0,
        averageMessagesPerConversation: parseFloat(basicStats.avg_messages_per_conversation) || 0,
        totalTokensUsed: parseInt(aiStats.total_tokens_used) || 0,
        averageConfidenceScore: parseFloat(aiStats.avg_confidence_score) || 0,
        mostUsedSessionType,
        conversationsBySessionType,
        dailyActivity
      };
    } finally {
      client.release();
    }
  }

  // Delete a conversation (soft delete)
  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
      ['deleted', conversationId, userId]
    );
    
    return result.rowCount > 0;
  }

  // Helper method to map database rows to Conversation objects
  private mapConversationRow(row: any): Conversation {
    return {
      id: row.id,
      userId: row.user_id,
      contextualCoreId: row.contextual_core_id,
      title: row.title,
      sessionType: row.session_type,
      status: row.status,
      totalMessages: row.total_messages,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at
    };
  }

  // Helper method to map database rows to Message objects
  private mapMessageRow(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      messageType: row.message_type,
      content: row.content,
      queryText: row.query_text,
      confidenceScore: row.confidence_score,
      processingTimeMs: row.processing_time_ms,
      aiProvider: row.ai_provider,
      aiModel: row.ai_model,
      tokenUsage: row.token_usage,
      metadata: row.metadata,
      createdAt: row.created_at,
      positionInConversation: row.position_in_conversation
    };
  }
}