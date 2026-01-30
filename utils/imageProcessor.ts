/**
 * Utility to process uploaded images on the client side.
 * Resizes images to a maximum height/width to ensure small file size (Base64).
 */

export const processLogoUpload = (file: File, maxHeight = 150): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 1. Basic Validation
        if (!file.type.startsWith('image/')) {
            reject(new Error('El archivo no es una imagen.'));
            return;
        }

        // Limit input size to avoid browser crash on massive images (e.g. > 10MB)
        if (file.size > 10 * 1024 * 1024) {
            reject(new Error('La imagen es demasiado grande (Máx 10MB).'));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                // 2. Resize Logic (Canvas)
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Maintain aspect ratio
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No se pudo procesar la imagen (Contexto 2D no disponible).'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // 3. Compress and Export as JPEG (usually smaller than PNG for photos, though PNG better for logos with transparency)
                // However, logos usually need transparency. Let's try PNG first but check size.
                // If the user uploads a photo, PNG might be heavy. 
                // Let's stick to PNG for logos to preserve transparency.
                // High compression? 

                // Let's check the size of the result. 
                const dataUrl = canvas.toDataURL('image/png', 0.8);

                // Very crude check: if > 100KB, maybe warn or try JPEG? 
                // But transparency is key for logos. We'll stick to PNG.

                resolve(dataUrl);
            };

            img.onerror = (err) => reject(new Error('Error al cargar la imagen.'));
        };

        reader.onerror = (err) => reject(new Error('Error al leer el archivo.'));
    });
};
