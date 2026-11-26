import { useState } from 'react'
import { dadosClima } from './dadosClima'
import { codigosWmo } from './codigosWmo'
import './App.css'

// "Florianopolis", " florianópolis " e "FLORIANÓPOLIS" passam a ser a mesma busca
function normalizar(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function infoClima(codigo) {
  return (
    codigosWmo.find(item => item.codigo === codigo) ?? {
      descricao: 'Sem informação',
      icone: '❔'
    }
  )
}

// Define o "clima visual" da página (cor do céu) a partir do código WMO
function temaDoCodigo(codigo) {
  if (codigo >= 95) return 'tempestade'
  if (codigo >= 71 && codigo <= 77) return 'neve'
  if (codigo >= 51) return 'chuva'
  if (codigo >= 45) return 'neblina'
  if (codigo >= 2) return 'nublado'
  return 'limpo'
}

// O "T12:00:00" evita que o fuso horário mude o dia exibido
function formatarDia(data, indice) {
  if (indice === 0) return 'Hoje'
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
}

function formatarAtualizacao(horario) {
  const [data, hora] = horario.split('T')
  const dia = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long'
  })
  return `${dia}, ${hora}`
}

function App() {
  const [busca, setBusca] = useState('')
  const [cidade, setCidade] = useState(null)
  const [erro, setErro] = useState('')

  function buscarPorNome(nome) {
    const resultado = dadosClima.find(
      item => normalizar(item.name) === normalizar(nome)
    )

    if (resultado) {
      setCidade(resultado)
      setErro('')
    } else {
      setCidade(null)
      setErro(`Não encontramos "${nome.trim()}". Tente uma das cidades abaixo.`)
    }
  }

  function aoEnviar(evento) {
    evento.preventDefault()
    if (!busca.trim()) return
    buscarPorNome(busca)
  }

  function escolherSugestao(nome) {
    setBusca(nome)
    buscarPorNome(nome)
  }

  const atual = cidade?.current
  const clima = atual ? infoClima(atual.weather_code) : null
  const tema = atual ? temaDoCodigo(atual.weather_code) : 'limpo'

  // Limites gerais da semana, usados para desenhar as barras de temperatura
  const minGeral = cidade ? Math.min(...cidade.daily.map(d => d.temperature_2m_min)) : 0
  const maxGeral = cidade ? Math.max(...cidade.daily.map(d => d.temperature_2m_max)) : 0
  const amplitude = maxGeral - minGeral || 1

  const detalhes = atual && [
    { icone: '/termometro.svg', rotulo: 'Sensação', valor: `${atual.apparent_temperature} °C` },
    { icone: '/umidade.svg', rotulo: 'Umidade', valor: `${atual.relative_humidity_2m}%` },
    { icone: '/vento.svg', rotulo: 'Vento', valor: `${atual.wind_speed_10m} km/h` },
    { icone: '/uv.svg', rotulo: 'Índice UV', valor: atual.uv_index },
    { icone: '/chuva-gota.svg', rotulo: 'Precipitação', valor: `${atual.precipitation} mm` },
    { icone: '/nascer-sol.svg', rotulo: 'Nascer do sol', valor: atual.sunrise },
    { icone: '/por-sol.svg', rotulo: 'Pôr do sol', valor: atual.sunset }
  ]

  return (
    <div className={`app tema-${tema}`}>
      <main className="conteudo">
        <header className="topo">
          <span className="logo" aria-hidden="true">⛅</span>
          <div>
            <h1>Sol-Chuva</h1>
            <p>Tempo certo, em qualquer lugar!</p>
          </div>
        </header>

        <form className="busca" onSubmit={aoEnviar} role="search">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Digite o nome de uma cidade..."
            aria-label="Nome da cidade"
          />
          <button type="submit">
            <img src="/busca.svg" alt="" width="18" height="18" />
            Buscar
          </button>
        </form>

        <ul className="sugestoes">
          {dadosClima.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => escolherSugestao(item.name)}>
                {item.name}
              </button>
            </li>
          ))}
        </ul>

        {erro && <p className="aviso" role="alert">{erro}</p>}

        {!cidade && !erro && (
          <p className="vazio">Busque uma cidade para ver como está o tempo agora.</p>
        )}

        {cidade && (
          <>
            <section className="agora" aria-live="polite">
              <p className="local">
                {cidade.name}, {cidade.admin1} · {cidade.country}
              </p>
              <div className="temperatura">
                <span className="grau">{Math.round(atual.temperature_2m)}°</span>
                <span className="icone-clima" aria-hidden="true">{clima.icone}</span>
              </div>
              <p className="descricao">{clima.descricao}</p>
              <p className="atualizado">Atualizado em {formatarAtualizacao(atual.time)}</p>
            </section>

            <section className="detalhes" aria-label="Condições atuais">
              {detalhes.map(item => (
                <div className="detalhe" key={item.rotulo}>
                  <img src={item.icone} alt="" width="28" height="28" />
                  <div>
                    <span className="detalhe-rotulo">{item.rotulo}</span>
                    <strong>{item.valor}</strong>
                  </div>
                </div>
              ))}
            </section>

            <section className="previsao" aria-label="Previsão para 10 dias">
              <h2>Próximos 10 dias</h2>
              <ul>
                {cidade.daily.map((dia, indice) => {
                  const info = infoClima(dia.weather_code)
                  const inicio = ((dia.temperature_2m_min - minGeral) / amplitude) * 100
                  const largura = ((dia.temperature_2m_max - dia.temperature_2m_min) / amplitude) * 100

                  return (
                    <li key={dia.date}>
                      <span className="dia">{formatarDia(dia.date, indice)}</span>
                      <span className="dia-icone" title={info.descricao}>{info.icone}</span>
                      <span className="chance">
                        <img src="/chuva-gota.svg" alt="" width="14" height="14" />
                        {dia.precipitation_probability_max}%
                      </span>
                      <span className="min">{dia.temperature_2m_min}°</span>
                      <span className="faixa" aria-hidden="true">
                        <span
                          className="faixa-barra"
                          style={{ left: `${inicio}%`, width: `${largura}%` }}
                        />
                      </span>
                      <span className="max">{dia.temperature_2m_max}°</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
