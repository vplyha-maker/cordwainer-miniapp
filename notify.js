const TELEGRAM_TOKEN = '8701832235:AAEJmXAHH1JXvKlSbbPHPSof9syQF2KuoiY'; 

const userIds = [
  5609347976, 
  5258852925, 
  986873651, 
  6919641430, 
  509268320, 
  6644753479
];

const message = `🎉 <b>Вам открыт полный PRO-доступ!</b>\n\nВсе закрытые разделы Cordwainer (лукбук, калькуляторы, рыночные данные) теперь доступны. Заходите в приложение и тестируйте!`;

async function sendNotifications() {
  console.log('Начинаем рассылку...');

  for (const id of userIds) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: id,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json();

      if (data.ok) {
        console.log(`✅ Успешно отправлено пользователю ${id}`);
      } else {
        console.error(`❌ Ошибка для ${id}:`, data.description);
      }
    } catch (error) {
      console.error(`❌ Ошибка сети при отправке ${id}:`, error.message);
    }

    await new Promise(res => setTimeout(res, 500));
  }
  
  console.log('🏁 Рассылка завершена!');
}

sendNotifications();
