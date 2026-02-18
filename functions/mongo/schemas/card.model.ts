import mongoose from 'mongoose';

const card = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  slug: { type: String, required: true },
  rarity: { type: String, required: true },
  name: { type: String, required: true },
  position: { type: String, required: true },
  power: { type: Number, required: true },
  owner: { type: String, required: true },
  averageScore5: { type: Number, required: true },
  averageScore15: { type: Number, required: true },
  averageScore10Played: { type: Number, required: true },
  edition: { type: String, required: true },
  u23Eligible: { type: Boolean, required: true },
  inSeasonEligible: { type: Boolean, required: true },
  clubSlug: { type: String, required: true },
});

export default card;
