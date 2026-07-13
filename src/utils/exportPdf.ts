import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { jsPDF } from 'jspdf';

/** Save/share a generated jsPDF document, working on both web and native Android. */
export async function exportPdf(doc: jsPDF, fileName: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Native (Android/iOS): write to cache, then open the native share sheet.
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.substring(dataUri.indexOf(',') + 1);
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: 'Share invoice PDF',
      });
    } catch (shareError) {
      // Catch and ignore cancellation of the share dialog
      // On some platforms/versions, cancelling throws an exception or returns empty, which is expected
      console.log('Share sheet closed/cancelled:', shareError);
    }
  } else {
    // Web: keep the normal browser download.
    doc.save(fileName);
  }
}
