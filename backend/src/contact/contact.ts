import Elysia, { t } from "elysia";
import { fillout } from "..";

const FORM_ID = '4S8bFyDi76us';

const router = new Elysia()
  .post('/', async ({ body }) => {
    // i'm using the sdk here bc it works but the other api is not working ofr some reason a im going to crash out.
    const metadata = (await fillout.getForm(FORM_ID)).questions
    const metaFirstName = metadata.find(q => q.name === 'First Name')!;
    const metaLastName = metadata.find(q => q.name === 'Last Name')!;
    const metaEmail = metadata.find(q => q.name === 'Email')!;
    const metaMessage = metadata.find(q => q.name === 'Question')!;
    
    const url = `https://api.fillout.com/v1/api/forms/${FORM_ID}/submissions`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FILLOUT!}`, 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submissions: [{
          questions: [
            { id: metaFirstName.id, value: body.firstName },
            { id: metaLastName.id, value: body.lastName },
            { id: metaEmail.id, value: body.email },
            { id: metaMessage.id, value: body.question }
          ]
        }]
      })
    };

    console.log(await (await fetch(url, options)).json());
    return { success: true, message: 'Contact form submitted successfully!' };
  }, {
    body: t.Object({
      firstName: t.String(),
      lastName: t.String(),
      email: t.String(),
      question: t.String()
    })
});

export default router;