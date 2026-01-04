
import fs from 'fs';
import path from 'path';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import fetch from 'node-fetch';

async function testUpload() {
    console.log('Testing upload...');

    // Create a dummy file
    const filePath = path.join(process.cwd(), 'test-doc.txt');
    fs.writeFileSync(filePath, 'This is a test document.');

    try {
        const formData = new FormData();
        formData.append('catalogId', '1'); // content
        formData.append('file', await fileFromPath(filePath, 'test-doc.txt', { type: 'text/plain' }));

        console.log('Sending request...');
        const response = await fetch('http://localhost:3001/api/documents/upload', {
            method: 'POST',
            body: formData as any
        });

        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response body:', text);

        try {
            const json = JSON.parse(text);
            console.log('JSON parse success:', json);
        } catch (e) {
            console.error('JSON parse failed');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Cleanup
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

testUpload();
