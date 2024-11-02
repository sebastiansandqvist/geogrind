import { Accessor, Component, createEffect, createSignal, For, Match, Switch } from 'solid-js';
import { Continent, continents, countries } from './data/countries';
import { sampleSize, shuffle } from './util';
import { autofocus } from '@solid-primitives/autofocus';

const WrongAnswerList: Component<{ answers: Accessor<string[]>; clear: () => void }> = (props) => {
  return (
    <div class="flex gap-1">
      <span class="opacity-50">wrong: </span>
      <For each={props.answers()}>
        {(answer) => {
          return <span>{answer}</span>;
        }}
      </For>
      <button onClick={props.clear}>×</button>
    </div>
  );
};

function isFitbCorrect(answer: string, question: Question) {
  const actual = question.answer.toLowerCase();
  const received = answer.trim().toLowerCase();
  return received.length > 2 && actual.includes(received);
}

function isEmoji(s: string): boolean {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  return emojiRegex.test(s);
}

const DisplayQuestion: Component<{
  question: Question;
  submitAnswer: (answer: string, question: Question, isFitb?: boolean) => void;
}> = (props) => {
  const [fitbAnswer, setFitbAnswer] = createSignal('');

  const handleSubmitFitb = (e?: Event) => {
    e?.preventDefault();
    props.submitAnswer(fitbAnswer().trim(), props.question, true);
    setFitbAnswer('');
  };

  return (
    <Switch>
      <Match keyed when={props.question.kind === 'mc' && props.question}>
        {(question) => (
          <article class="mx-auto w-64 text-center">
            <h1 class={isEmoji(question.prompt) ? 'text-[10rem]' : ''}>{question.prompt}</h1>
            <div class="grid gap-1">
              <For each={question.options}>
                {({ value }) => (
                  <button
                    class="cursor-pointer bg-white p-1 font-medium text-black"
                    classList={{
                      'text-6xl': isEmoji(value),
                    }}
                    onClick={() => props.submitAnswer(value, question)}
                  >
                    {value}
                  </button>
                )}
              </For>
            </div>
          </article>
        )}
      </Match>
      <Match keyed when={props.question.kind === 'fitb' && props.question}>
        {(question) => (
          <form class="mx-auto w-64 text-center" onSubmit={handleSubmitFitb}>
            <h1 class={isEmoji(question.prompt) ? 'text-[10rem]' : ''}>{question.prompt}</h1>
            <div class="grid gap-1">
              <input
                ref={autofocus}
                autofocus
                class="border border-neutral-500 px-2 outline-0 focus:border-sky-500"
                type="text"
                value={fitbAnswer()}
                onInput={(e) => {
                  setFitbAnswer(e.currentTarget.value);
                  if (e.currentTarget.value.toLowerCase() === question.answer.toLowerCase()) {
                    handleSubmitFitb();
                  }
                }}
              />
              <button class="cursor-pointer bg-white p-1 font-medium text-black" type="submit">
                Submit
              </button>
            </div>
          </form>
        )}
      </Match>
    </Switch>
  );
};

type McQuestion = {
  kind: 'mc';
  prompt: string;
  answer: string;
  options: {
    value: string;
    correct: boolean;
  }[];
};

type FitbQuestion = {
  kind: 'fitb';
  prompt: string;
  answer: string;
};

type Question = McQuestion | FitbQuestion;
type Region = Continent | 'world';

let queue = shuffle(countries);

function getFilteredQueue({ region, geoguessrOnly }: { region: Region; geoguessrOnly: boolean }) {
  return shuffle(countries).filter(({ isOnGeoguessr, continent }) => {
    if (geoguessrOnly && !isOnGeoguessr) return false;
    if (region === 'world') return true;
    if (region !== continent) return false;
    return true;
  });
}

function pickNextQuestion({
  region,
  geoguessrOnly,
  flagIsPrompt,
  correctAnswers,
}: {
  region: Region;
  geoguessrOnly: boolean;
  flagIsPrompt: boolean;
  correctAnswers: string[];
}): Question {
  if (queue.length === 0) {
    queue = getFilteredQueue({ region, geoguessrOnly });
  }

  const nextCountry = queue.shift()!;
  const isFitb = !flagIsPrompt && correctAnswers.includes(nextCountry.country);
  return isFitb
    ? {
        kind: 'fitb',
        prompt: flagIsPrompt ? nextCountry.flag : nextCountry.country,
        answer: flagIsPrompt ? nextCountry.country : nextCountry.flag,
      }
    : {
        kind: 'mc',
        prompt: flagIsPrompt ? nextCountry.flag : nextCountry.country,
        answer: flagIsPrompt ? nextCountry.country : nextCountry.flag,
        options: shuffle([
          ...sampleSize(
            getFilteredQueue({ region, geoguessrOnly }).filter((c) => c.country !== nextCountry.country),
            3,
          ),
          nextCountry,
        ]).map(({ country, flag }) => ({
          correct: country === nextCountry.country,
          value: flagIsPrompt ? country : flag,
        })),
      };
}

const App: Component = () => {
  const [geoguessrOnly, setGeoguessrOnly] = createSignal(true);
  const [flagIsPrompt, setFlagIsPrompt] = createSignal(true);
  const [region, setRegion] = createSignal<Region>('world');
  const [correctAnswers, setCorrectAnswers] = createSignal<string[]>([]);
  const [incorrectAnswers, setIncorrectAnswers] = createSignal<string[]>([]);

  const next = () =>
    pickNextQuestion({
      region: region(),
      geoguessrOnly: geoguessrOnly(),
      flagIsPrompt: flagIsPrompt(),
      correctAnswers: correctAnswers(),
    });

  const [currentQuestion, setCurrentQuestion] = createSignal<Question>(next());

  // when flagIsPrompt changes, set the next question
  createEffect(() => {
    flagIsPrompt();
    setCurrentQuestion(next());
  });

  // when region or geoguessrOnly change, re-filter the queue
  createEffect(() => {
    queue = getFilteredQueue({
      region: region(),
      geoguessrOnly: geoguessrOnly(),
    });
    setCurrentQuestion((current) => {
      // TODO: probably use IDs for each country and map by ID instead
      if (queue.find(({ country }) => current.answer === country || current.prompt === country)) {
        return current;
      }
      return next();
    });
  });

  return (
    <div class="grid gap-6 p-8">
      <div class="flex flex-wrap gap-x-2">
        <label class="select-none">
          <input
            type="radio"
            name="region"
            value="world"
            checked={region() === 'world'}
            onChange={() => setRegion('world')}
          />
          World
        </label>
        <For each={continents}>
          {(continent) => (
            <label class="select-none">
              <input
                type="radio"
                name="region"
                value={continent}
                checked={region() === continent}
                onChange={() => setRegion(continent)}
              />
              {continent}
            </label>
          )}
        </For>
      </div>
      <div class="flex gap-2">
        <label class="select-none">
          <input type="checkbox" checked={geoguessrOnly()} onChange={(e) => setGeoguessrOnly(e.target.checked)} />
          Geoguessr
        </label>
        <label class="select-none">
          <input type="checkbox" checked={flagIsPrompt()} onChange={(e) => setFlagIsPrompt(e.target.checked)} />
          Flag is prompt
        </label>
      </div>
      <DisplayQuestion
        question={currentQuestion()}
        submitAnswer={(answer, question, isFitb) => {
          const isCorrect = isFitb ? isFitbCorrect(answer, question) : question.answer === answer;

          if (isCorrect) {
            setCorrectAnswers((prev) => [...prev.filter((x) => x !== answer), answer]);
            setIncorrectAnswers((prev) => [...prev.filter((x) => x !== question.prompt)]);
            setCurrentQuestion(next());
          } else {
            alert(`${question.prompt} ${question.answer}`);
            setCorrectAnswers((prev) => [...prev.filter((x) => x !== answer)]);
            setIncorrectAnswers((prev) => [...prev, question.prompt]);
            setCurrentQuestion(next());
          }
        }}
      />
      <WrongAnswerList answers={incorrectAnswers} clear={() => setIncorrectAnswers([])} />
    </div>
  );
};

export default App;
