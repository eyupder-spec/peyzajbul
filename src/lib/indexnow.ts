const INDEXNOW_KEY = "9af8806fc5a648ae9a9b857706e0ac5d";
const HOST = "www.peyzajbul.com";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export async function submitToIndexNow(urlList: string[]): Promise<boolean> {
  if (!urlList || urlList.length === 0) {
    console.log("IndexNow: Boş liste, gönderim yapılmadı.");
    return false;
  }

  try {
    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urlList,
    };

    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: "api.indexnow.org",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 200) {
      console.log(`IndexNow: Başarıyla ${urlList.length} adet URL gönderildi.`);
      return true;
    } else if (response.status === 202) {
      console.log(`IndexNow: ${urlList.length} adet URL kabul edildi (Doğrulama bekleniyor).`);
      return true;
    } else {
      console.error(`IndexNow Hatası: ${response.status} - ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("IndexNow API çağrısı başarısız:", error);
    return false;
  }
}
