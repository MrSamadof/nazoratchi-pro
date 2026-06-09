import type { Types } from 'mongoose';
import { CompanyRule, type CompanyRuleDoc } from './company-rules.model.js';

export interface RuleInput {
  title: string;
  category: string;
  content: string;
  order?: number;
  isActive?: boolean;
}

export class CompanyRulesService {
  async findAll(): Promise<CompanyRuleDoc[]> {
    return CompanyRule.find({ isActive: true }).sort({ category: 1, order: 1 });
  }

  async findAllIncludingInactive(): Promise<CompanyRuleDoc[]> {
    return CompanyRule.find({}).sort({ category: 1, order: 1 });
  }

  async findByCategory(category: string): Promise<CompanyRuleDoc[]> {
    return CompanyRule.find({ category, isActive: true }).sort({ order: 1 });
  }

  async findById(id: string | Types.ObjectId): Promise<CompanyRuleDoc | null> {
    return CompanyRule.findById(id);
  }

  async create(input: RuleInput): Promise<CompanyRuleDoc> {
    return CompanyRule.create({
      title: input.title,
      category: input.category,
      content: input.content,
      order: input.order ?? 0,
      isActive: input.isActive ?? true,
    });
  }

  async update(
    id: string | Types.ObjectId,
    input: Partial<RuleInput>,
  ): Promise<CompanyRuleDoc | null> {
    return CompanyRule.findByIdAndUpdate(id, input, { new: true });
  }

  async deactivate(id: string | Types.ObjectId): Promise<CompanyRuleDoc | null> {
    return CompanyRule.findByIdAndDelete(id);
  }
}

export const companyRulesService = new CompanyRulesService();
