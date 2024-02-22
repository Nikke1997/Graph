import { useQuery, useMutation } from "@apollo/client";
import { ALL_AUTHORS } from "../queries";
import { UPDATE_AUTHOR } from "../queries";
import { useState } from "react";



const Authors = () => {
const [name, setName] = useState('');
const [born, setBorn] = useState('');


const result = useQuery(ALL_AUTHORS);

const [updateAuthor] = useMutation(UPDATE_AUTHOR, {
  refetchQueries: [{ query: ALL_AUTHORS }],
});

if (result.loading) {
    return <div>loading...</div>;
  }

  const submit = async (event) => {
    event.preventDefault();

    updateAuthor({ variables: { name, born: parseInt(born) } });

    console.log('update author...');

    setName('');
    setBorn('');
  }


  const options = result.data.allAuthors.map((a) => (
    <option key={a.name} value={a.name}>
      {a.name}
    </option>
  ));

  console.log('result', result.data);

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {result.data.allAuthors.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <h2>Set birthyear</h2>
        <form onSubmit={submit}>
          <div>
            name
            <select value={name} onChange={(e) => setName(e.target.value)}>
                      {options}
              </select>
          </div>
          <div>
            born
            <input type="number" value={born} onChange={e => setBorn(e.target.value)}/>
          </div>
          <button type="submit">update author</button>
        </form>
      </div>
    </div>
  );
};

export default Authors;
