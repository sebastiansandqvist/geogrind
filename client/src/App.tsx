import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';
import { Continent, continents, countries, Country } from './data/countries';
import { deburr, isEmoji, sampleSize, shuffle } from './util';
import { autofocus } from '@solid-primitives/autofocus';
import { flashMessage, FlashMessageContainer } from './components/flashMessage';

const WrongAnswerList: Component<{
  answers: string[];
  clear: () => void;
  onItemClick: (item: string) => void;
}> = (props) => {
  return (
    <Show when={props.answers.length > 0}>
      <div class="flex flex-wrap items-center gap-1">
        <span class="opacity-50">wrong: </span>
        <For each={props.answers}>
          {(answer) => {
            return (
              <button
                class="cursor-pointer"
                classList={{
                  'text-xl': isEmoji(answer),
                }}
                onClick={() => props.onItemClick(answer)}
              >
                {answer}
              </button>
            );
          }}
        </For>
        <button class="cursor-pointer opacity-50 transition hover:opacity-100" onClick={props.clear}>
          ×
        </button>
      </div>
    </Show>
  );
};

function isFitbCorrect(answer: string, question: Question) {
  const actual = deburr(question.answer.toLowerCase());
  const received = deburr(answer.trim().toLowerCase());
  return received.length > 2 && actual.includes(received);
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
            <h1 class={isEmoji(question.prompt) ? 'text-[10rem]' : 'mb-4 text-2xl'}>{question.prompt}</h1>
            <div class="grid gap-1">
              <For each={question.options}>
                {({ value }) => (
                  <button
                    class="cursor-pointer bg-white p-1.5 font-medium text-black"
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
                  if (deburr(e.currentTarget.value.toLowerCase()) === deburr(question.answer.toLowerCase())) {
                    handleSubmitFitb();
                  }
                }}
              />
              <button class="cursor-pointer bg-white p-1.5 font-medium text-black" type="submit">
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
  const isFitb = flagIsPrompt && correctAnswers.includes(nextCountry.country);
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

const Quiz: Component = () => {
  const [geoguessrOnly, setGeoguessrOnly] = createSignal(true);
  const [flagIsPrompt, setFlagIsPrompt] = createSignal(true);
  const [region, setRegion] = createSignal<Region>('world');
  const [correctAnswers, setCorrectAnswers] = createSignal<string[]>([]);
  const [incorrectAnswers, setIncorrectAnswers] = createSignal<string[]>([]);
  const [logs, setLogs] = createSignal<{ country: Country; correct: boolean }[]>([]);

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
    <div class="mx-auto grid max-w-4xl gap-6 p-8">
      <div class="flex flex-wrap gap-x-4">
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
      <div class="flex gap-4">
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
          const correct = isFitb ? isFitbCorrect(answer, question) : question.answer === answer;
          const entry = countries.find((x) => x.country === question.answer || x.country === question.prompt);

          if (correct) {
            setCorrectAnswers((prev) => [...prev.filter((x) => x !== answer), answer]);
            setIncorrectAnswers((prev) => [...prev.filter((x) => x !== question.prompt)]);
            setCurrentQuestion(next());
          } else {
            setCorrectAnswers((prev) => [...prev.filter((x) => x !== answer)]);
            setIncorrectAnswers((prev) => [...prev, question.prompt]);
            setCurrentQuestion(next());
          }

          if (entry) {
            const { country, flag, drivesOnThe, dialingPrefix } = entry;
            const message = `${flag}\n${country} (${dialingPrefix.trim()})\ndrives ${drivesOnThe}`;
            flashMessage(message, correct ? 'green' : 'red');
            setLogs((prev) => [{ country: entry, correct }, ...prev]);
          }
        }}
      />
      <Logs logs={logs()} />
      <WrongAnswerList
        answers={incorrectAnswers()}
        clear={() => setIncorrectAnswers([])}
        onItemClick={(item) => {
          const country = countries.find((x) => x.country === item || x.flag === item);
          if (!country) return;

          // since we're replacing the current question,
          // push it back onto the queue for later so it's not skipped
          const { answer, prompt } = currentQuestion();
          const currentItemCountry = countries.find((x) => x.country === answer || x.country === prompt);
          if (currentItemCountry) queue.push(currentItemCountry);

          // surface the question and remove it from the list of mistakes
          setCurrentQuestion({
            kind: 'fitb',
            answer: flagIsPrompt() ? country.country : country.flag,
            prompt: flagIsPrompt() ? country.flag : country.country,
          });
          setIncorrectAnswers((prev) => [...prev.filter((x) => x !== country.flag && x !== country.country)]);
        }}
      />
    </div>
  );
};

const Logs: Component<{ logs: { country: Country; correct: boolean }[] }> = (props) => {
  return (
    <output class="flex h-72 w-full flex-col gap-2 overflow-scroll border border-neutral-500 p-2">
      <For each={props.logs}>
        {({ correct, country: { country, dialingPrefix, drivesOnThe, flag } }) => (
          <div
            class="flex items-center justify-between gap-2 border px-2"
            classList={{
              'border-emerald-500': correct,
              'border-rose-500': !correct,
            }}
          >
            <div class="flex items-center gap-2">
              <span class="text-3xl">{flag}</span>
              <strong class="font-medium">{country}</strong>
              <span class="opacity-50">{dialingPrefix}</span>
              <span>
                🚗 <span class="opacity-75">{drivesOnThe}</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <a
                class="underline transition hover:text-sky-400"
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(country)}`}
              >
                wiki
              </a>
              <a
                class="underline transition hover:text-sky-400"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(country)}`}
              >
                map
              </a>
            </div>
          </div>
        )}
      </For>
    </output>
  );
};

export function App() {
  return (
    <>
      <Quiz />
      <FlashMessageContainer />
    </>
  );
}
