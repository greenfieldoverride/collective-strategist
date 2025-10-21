import { Database } from '../database/connection';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Asset {
  id: string;
  venture_id: string;
  name: string;
  description?: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  alt_text?: string;
  dimensions?: { width: number; height: number };
  metadata?: any;
  upload_source?: string;
  is_brand_asset: boolean;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  created_by?: string;
  tags?: AssetTag[];
}

export interface AssetTag {
  id: string;
  venture_id: string;
  name: string;
  color?: string;
  description?: string;
  created_at: string;
}

export interface BrandIdentityElement {
  id: string;
  venture_id: string;
  element_type: string;
  element_value: string;
  element_metadata?: any;
  display_name?: string;
  guidelines?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetUsage {
  id: string;
  asset_id: string;
  used_in_type: string;
  used_in_id?: string;
  usage_context?: any;
  used_at: string;
}

export interface CreateAssetRequest {
  venture_id: string;
  name: string;
  description?: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  alt_text?: string;
  dimensions?: { width: number; height: number };
  metadata?: any;
  upload_source?: string;
  is_brand_asset?: boolean;
  created_by?: string;
  tag_ids?: string[];
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  alt_text?: string;
  is_brand_asset?: boolean;
  status?: 'active' | 'archived' | 'deleted';
  tag_ids?: string[];
}

export interface CreateTagRequest {
  venture_id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface CreateBrandElementRequest {
  venture_id: string;
  element_type: string;
  element_value: string;
  element_metadata?: any;
  display_name?: string;
  guidelines?: string;
}

export class AssetService {
  private db: Database;
  private uploadsPath: string;

  constructor(db: Database) {
    this.db = db;
    this.uploadsPath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.access(this.uploadsPath);
    } catch {
      await fs.mkdir(this.uploadsPath, { recursive: true });
    }
  }

  // Asset Management
  async createAsset(request: CreateAssetRequest, fileBuffer?: Buffer): Promise<Asset> {
    const assetId = uuidv4();
    let filePath = '';

    // Handle file storage
    if (fileBuffer) {
      const fileExtension = path.extname(request.name) || this.getExtensionFromMimeType(request.mime_type);
      const fileName = `${assetId}${fileExtension}`;
      filePath = path.join(this.uploadsPath, fileName);
      
      await fs.writeFile(filePath, fileBuffer);
      // Store relative path for database
      filePath = `uploads/${fileName}`;
    }

    const query = `
      INSERT INTO assets (
        id, venture_id, name, description, file_type, mime_type, file_size,
        file_path, alt_text, dimensions, metadata, upload_source, is_brand_asset,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      assetId,
      request.venture_id,
      request.name,
      request.description,
      request.file_type,
      request.mime_type,
      request.file_size,
      filePath,
      request.alt_text,
      request.dimensions ? JSON.stringify(request.dimensions) : null,
      request.metadata ? JSON.stringify(request.metadata) : null,
      request.upload_source || 'manual',
      request.is_brand_asset || false,
      request.created_by
    ];

    const result = await this.db.query(query, values);

    // Add tags if provided
    if (request.tag_ids && request.tag_ids.length > 0) {
      await this.addTagsToAsset(assetId, request.tag_ids);
    }

    return this.getAssetWithTags(assetId);
  }

  async getAssets(
    ventureId: string, 
    options: {
      fileType?: string;
      isBrandAsset?: boolean;
      tagIds?: string[];
      search?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'created_at' | 'name' | 'file_size';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ assets: Asset[]; total: number }> {
    // Build the main query
    let query = `
      SELECT DISTINCT a.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', at.id,
              'venture_id', at.venture_id,
              'name', at.name,
              'color', at.color,
              'description', at.description,
              'created_at', at.created_at
            )
          ) FILTER (WHERE at.id IS NOT NULL), '[]'
        ) as tags
      FROM assets a
      LEFT JOIN asset_tag_relationships atr ON a.id = atr.asset_id
      LEFT JOIN asset_tags at ON atr.tag_id = at.id
      WHERE a.venture_id = $1 AND a.status = 'active'
    `;

    const values: any[] = [ventureId];
    let paramIndex = 2;

    // Add filters
    if (options.fileType) {
      query += ` AND a.file_type = $${paramIndex}`;
      values.push(options.fileType);
      paramIndex++;
    }

    if (options.isBrandAsset !== undefined) {
      query += ` AND a.is_brand_asset = $${paramIndex}`;
      values.push(options.isBrandAsset);
      paramIndex++;
    }

    if (options.search) {
      query += ` AND (a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`;
      values.push(`%${options.search}%`);
      paramIndex++;
    }

    if (options.tagIds && options.tagIds.length > 0) {
      const placeholders = options.tagIds.map((_, index) => `$${paramIndex + index}`).join(',');
      query += ` AND EXISTS (
        SELECT 1 FROM asset_tag_relationships atr2 
        WHERE atr2.asset_id = a.id AND atr2.tag_id IN (${placeholders})
      )`;
      values.push(...options.tagIds);
      paramIndex += options.tagIds.length;
    }

    query += ` GROUP BY a.id`;

    // Add sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query += ` ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
      paramIndex++;
    }

    const result = await this.db.query(query, values);

    // Get total count for pagination
    const total = await this.getAssetsCount(ventureId, options);

    return {
      assets: result.rows,
      total
    };
  }

  private async getAssetsCount(
    ventureId: string, 
    options: {
      fileType?: string;
      isBrandAsset?: boolean;
      tagIds?: string[];
      search?: string;
    }
  ): Promise<number> {
    let countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM assets a
      LEFT JOIN asset_tag_relationships atr ON a.id = atr.asset_id
      WHERE a.venture_id = $1 AND a.status = 'active'
    `;

    const countValues: any[] = [ventureId];
    let countParamIndex = 2;

    // Apply same filters to count query
    if (options.fileType) {
      countQuery += ` AND a.file_type = $${countParamIndex}`;
      countValues.push(options.fileType);
      countParamIndex++;
    }

    if (options.isBrandAsset !== undefined) {
      countQuery += ` AND a.is_brand_asset = $${countParamIndex}`;
      countValues.push(options.isBrandAsset);
      countParamIndex++;
    }

    if (options.search) {
      countQuery += ` AND (a.name ILIKE $${countParamIndex} OR a.description ILIKE $${countParamIndex})`;
      countValues.push(`%${options.search}%`);
      countParamIndex++;
    }

    if (options.tagIds && options.tagIds.length > 0) {
      const placeholders = options.tagIds.map((_, index) => `$${countParamIndex + index}`).join(',');
      countQuery += ` AND EXISTS (
        SELECT 1 FROM asset_tag_relationships atr2 
        WHERE atr2.asset_id = a.id AND atr2.tag_id IN (${placeholders})
      )`;
      countValues.push(...options.tagIds);
      countParamIndex += options.tagIds.length;
    }

    const countResult = await this.db.query(countQuery, countValues);
    return parseInt(countResult.rows[0].total);
  }

  async getAssetWithTags(assetId: string): Promise<Asset> {
    const query = `
      SELECT a.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', at.id,
              'venture_id', at.venture_id,
              'name', at.name,
              'color', at.color,
              'description', at.description,
              'created_at', at.created_at
            )
          ) FILTER (WHERE at.id IS NOT NULL), '[]'
        ) as tags
      FROM assets a
      LEFT JOIN asset_tag_relationships atr ON a.id = atr.asset_id
      LEFT JOIN asset_tags at ON atr.tag_id = at.id
      WHERE a.id = $1
      GROUP BY a.id
    `;

    const result = await this.db.query(query, [assetId]);
    if (result.rows.length === 0) {
      throw new Error('Asset not found');
    }

    return result.rows[0];
  }

  async updateAsset(assetId: string, updates: UpdateAssetRequest): Promise<Asset> {
    const { tag_ids, ...assetUpdates } = updates;

    if (Object.keys(assetUpdates).length > 0) {
      const setClause = Object.keys(assetUpdates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE assets 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const values = [assetId, ...Object.values(assetUpdates)];
      await this.db.query(query, values);
    }

    // Update tags if provided
    if (tag_ids !== undefined) {
      await this.replaceAssetTags(assetId, tag_ids);
    }

    return this.getAssetWithTags(assetId);
  }

  async deleteAsset(assetId: string): Promise<void> {
    // Get asset info for file cleanup
    const asset = await this.getAssetWithTags(assetId);
    
    // Soft delete in database
    await this.db.query(
      'UPDATE assets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['deleted', assetId]
    );

    // Remove file if it exists
    if (asset.file_path && asset.file_path.startsWith('uploads/')) {
      const fullPath = path.join(process.cwd(), asset.file_path);
      try {
        await fs.unlink(fullPath);
      } catch (error) {
        console.warn('Failed to delete file:', error);
      }
    }
  }

  // Tag Management
  async createTag(request: CreateTagRequest): Promise<AssetTag> {
    const query = `
      INSERT INTO asset_tags (venture_id, name, color, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [request.venture_id, request.name, request.color, request.description];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getTags(ventureId: string): Promise<AssetTag[]> {
    const query = `
      SELECT at.*, COUNT(atr.asset_id) as asset_count
      FROM asset_tags at
      LEFT JOIN asset_tag_relationships atr ON at.id = atr.tag_id
      LEFT JOIN assets a ON atr.asset_id = a.id AND a.status = 'active'
      WHERE at.venture_id = $1
      GROUP BY at.id
      ORDER BY at.name
    `;

    const result = await this.db.query(query, [ventureId]);
    return result.rows;
  }

  async addTagsToAsset(assetId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    const placeholders = tagIds.map((_, index) => `($1, $${index + 2})`).join(', ');
    const query = `
      INSERT INTO asset_tag_relationships (asset_id, tag_id)
      VALUES ${placeholders}
      ON CONFLICT (asset_id, tag_id) DO NOTHING
    `;

    const values = [assetId, ...tagIds];
    await this.db.query(query, values);
  }

  async removeTagsFromAsset(assetId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    const placeholders = tagIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      DELETE FROM asset_tag_relationships 
      WHERE asset_id = $1 AND tag_id IN (${placeholders})
    `;

    const values = [assetId, ...tagIds];
    await this.db.query(query, values);
  }

  async replaceAssetTags(assetId: string, tagIds: string[]): Promise<void> {
    // Remove all existing tags
    await this.db.query(
      'DELETE FROM asset_tag_relationships WHERE asset_id = $1',
      [assetId]
    );

    // Add new tags
    if (tagIds.length > 0) {
      await this.addTagsToAsset(assetId, tagIds);
    }
  }

  // Brand Identity Management
  async createBrandElement(request: CreateBrandElementRequest): Promise<BrandIdentityElement> {
    const query = `
      INSERT INTO brand_identity (
        venture_id, element_type, element_value, element_metadata,
        display_name, guidelines
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (venture_id, element_type) 
      DO UPDATE SET 
        element_value = EXCLUDED.element_value,
        element_metadata = EXCLUDED.element_metadata,
        display_name = EXCLUDED.display_name,
        guidelines = EXCLUDED.guidelines,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      request.venture_id,
      request.element_type,
      request.element_value,
      request.element_metadata ? JSON.stringify(request.element_metadata) : null,
      request.display_name,
      request.guidelines
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getBrandIdentity(ventureId: string): Promise<BrandIdentityElement[]> {
    const query = `
      SELECT * FROM brand_identity 
      WHERE venture_id = $1 AND is_active = true
      ORDER BY element_type
    `;

    const result = await this.db.query(query, [ventureId]);
    return result.rows;
  }

  async trackAssetUsage(assetId: string, usedInType: string, usedInId?: string, context?: any): Promise<void> {
    const query = `
      INSERT INTO asset_usage (asset_id, used_in_type, used_in_id, usage_context)
      VALUES ($1, $2, $3, $4)
    `;

    const values = [
      assetId,
      usedInType,
      usedInId,
      context ? JSON.stringify(context) : null
    ];

    await this.db.query(query, values);
  }

  async getAssetUsage(assetId: string): Promise<AssetUsage[]> {
    const query = `
      SELECT * FROM asset_usage 
      WHERE asset_id = $1
      ORDER BY used_at DESC
    `;

    const result = await this.db.query(query, [assetId]);
    return result.rows;
  }

  // Utility methods
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
      'application/json': '.json'
    };

    return mimeToExt[mimeType] || '';
  }

  async getAssetsByType(ventureId: string, fileType: string): Promise<Asset[]> {
    const { assets } = await this.getAssets(ventureId, { fileType });
    return assets;
  }

  async getBrandAssets(ventureId: string): Promise<Asset[]> {
    const { assets } = await this.getAssets(ventureId, { isBrandAsset: true });
    return assets;
  }

  async searchAssets(ventureId: string, searchTerm: string): Promise<Asset[]> {
    const { assets } = await this.getAssets(ventureId, { search: searchTerm });
    return assets;
  }
}