import { useQuery } from '@apollo/client'
import { ALL_BOOKS } from '../queries'

const Books = () => {
  const result = useQuery(ALL_BOOKS)

  if (result.loading) {
    return <div>loading...</div>
  }

  console.log('result', result.data)

  return (
    <div>
      <h2>books</h2>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th style={{ padding: '8px' }}>author</th>
            <th style={{ padding: '8px'}}>published</th>
          </tr>
          {result.data.allBooks.map((a) => (
            <tr key={a.title}>
              <td style={{ padding: '8px' }}>{a.title}</td>
              <td style={{ padding: '8px' }}>{a.author.name}</td>
              <td style={{ padding: '8px' }}>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Books
