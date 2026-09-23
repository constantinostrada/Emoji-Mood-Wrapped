/**
 * Words that say nothing about a person.
 *
 * Spanish and English only — those are the two languages V1 supports. The list
 * is deliberately chat-flavoured: it includes the fillers people actually type
 * (`dale`, `bueno`, `ok`, `yeah`) on top of the usual articles and pronouns,
 * because without them every single Wrapped's top word is "que".
 */

const SPANISH = [
  'a','al','algo','algun','alguna','alguno','algunos','ahi','ahora','anda','ante','antes','aqui','asi','aun','aunque',
  'bien','bueno','buenas','buenos',
  'cada','casi','como','con','contra','cosa','creo','cual','cuando','cuanto',
  'dale','de','del','desde','despues','donde','dos','durante',
  'el','ella','ellas','ellos','en','entonces','entre','era','eran','eres','es','esa','ese','eso','esos','esta','estaba','estamos','estan','estar','este','esto','estos','estoy','ey',
  'fue','fueron','fui',
  'ha','habia','hace','hacer','hacia','hasta','hay','he','hola',
  'igual','iba','ir',
  'la','las','le','les','lo','los','luego',
  'mas','me','mi','mia','mio','mis','mismo','mucho','muchos','muy',
  'nada','nadie','ni','no','nos','nosotros','nuestra','nuestro','nunca',
  'obvio','otra','otro','otros',
  'para','pero','poco','por','porque','pues',
  'que','quien','quiero',
  'se','sea','segun','ser','si','siempre','sin','sino','sobre','solo','somos','son','soy','su','sus',
  'tal','tambien','tampoco','tan','tanto','te','tengo','tener','tiene','tienen','toda','todo','todos','tu','tus',
  'un','una','uno','unos','usted','ustedes',
  'va','vamos','van','vas','ver','vez','voy','vos',
  'y','ya','yo',
]

const ENGLISH = [
  'a','about','after','again','all','also','am','an','and','any','are','as','at',
  'back','be','because','been','before','being','but','by',
  'can','come','could',
  'did','do','does','doing','done','dont',
  'each','even','ever','every',
  'for','from',
  'get','go','going','good','got',
  'had','has','have','he','her','here','hers','hey','him','his','how',
  'i','if','im','in','into','is','it','its',
  'just',
  'know',
  'like','ll',
  'made','make','many','maybe','me','more','most','much','my',
  'need','never','new','no','not','now',
  'of','off','oh','ok','okay','on','once','one','only','or','other','our','out','over',
  'really','right',
  'said','same','say','see','she','should','so','some','still','such','sure',
  'than','that','thats','the','their','them','then','there','these','they','thing','think','this','those','though','through','time','to','too',
  'up','us','use',
  'very',
  'want','was','way','we','well','were','what','when','where','which','while','who','why','will','with','would',
  'yeah','yep','yes','yet','you','your','youre',
]

/** Lookup set. Entries are stored unaccented, matching `normalizeWord`. */
export const STOPWORDS: ReadonlySet<string> = new Set([...SPANISH, ...ENGLISH])
