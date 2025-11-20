const mongoose = require('mongoose');
const AiProfile = require('./models/AiProfile');
require('dotenv').config();

const seedDefaultProfile = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aireviews');
        console.log('Connected to MongoDB');

        // Check if default profile exists
        const existingDefault = await AiProfile.findOne({ isDefault: true });

        if (existingDefault) {
            console.log('Default profile already exists:', existingDefault.name);
        } else {
            // Create default profile
            const defaultProfile = new AiProfile({
                name: 'Default Assistant',
                systemPrompt: 'You are a helpful AI assistant that reviews code changes and provides constructive feedback.',
                temperature: 0.7,
                maxTokens: 2000,
                model: 'llama3:8b',
                isDefault: true
            });

            await defaultProfile.save();
            console.log('Default profile created successfully!');
        }

        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error seeding profiles:', error);
        process.exit(1);
    }
};

seedDefaultProfile();
