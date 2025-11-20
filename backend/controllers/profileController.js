const AiProfile = require('../models/AiProfile');

/**
 * Get all AI profiles
 */
exports.getAllProfiles = async (req, res) => {
    try {
        const profiles = await AiProfile.find().sort({ isDefault: -1, createdAt: -1 });
        res.json(profiles);
    } catch (error) {
        console.error("❌ Get Profiles Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get a single profile by ID
 */
exports.getProfile = async (req, res) => {
    try {
        const profile = await AiProfile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }
        res.json(profile);
    } catch (error) {
        console.error("❌ Get Profile Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get the default profile
 */
exports.getDefaultProfile = async (req, res) => {
    try {
        const profile = await AiProfile.findOne({ isDefault: true });
        res.json(profile || null);
    } catch (error) {
        console.error("❌ Get Default Profile Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create a new AI profile
 */
exports.createProfile = async (req, res) => {
    try {
        const { name, systemPrompt, temperature, maxTokens, model, isDefault } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Profile name is required" });
        }

        const profile = new AiProfile({
            name,
            systemPrompt,
            temperature,
            maxTokens,
            model,
            isDefault
        });

        await profile.save();
        console.log(`✅ Created AI profile: ${name}`);
        res.status(201).json(profile);
    } catch (error) {
        console.error("❌ Create Profile Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update an AI profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const { name, systemPrompt, temperature, maxTokens, model, isDefault } = req.body;

        const profile = await AiProfile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        if (name) profile.name = name;
        if (systemPrompt !== undefined) profile.systemPrompt = systemPrompt;
        if (temperature !== undefined) profile.temperature = temperature;
        if (maxTokens !== undefined) profile.maxTokens = maxTokens;
        if (model) profile.model = model;
        if (isDefault !== undefined) profile.isDefault = isDefault;

        await profile.save();
        console.log(`✅ Updated AI profile: ${profile.name}`);
        res.json(profile);
    } catch (error) {
        console.error("❌ Update Profile Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete an AI profile
 */
exports.deleteProfile = async (req, res) => {
    try {
        const profile = await AiProfile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        if (profile.isDefault) {
            return res.status(400).json({ error: "Cannot delete the default profile. Set another profile as default first." });
        }

        await AiProfile.deleteOne({ _id: req.params.id });
        console.log(`🗑️ Deleted AI profile: ${profile.name}`);
        res.json({ message: "Profile deleted successfully" });
    } catch (error) {
        console.error("❌ Delete Profile Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};
