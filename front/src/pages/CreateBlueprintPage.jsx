import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import BlueprintForm from '../components/BlueprintForm.jsx'
import { clearError, createBlueprint } from '../features/blueprints/blueprintsSlice.js'
import { selectRequest } from '../features/blueprints/selectors.js'

export default function CreateBlueprintPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const request = useSelector(selectRequest('createBlueprint'))

  // No arrastrar errores de un intento anterior
  useEffect(() => {
    dispatch(clearError('createBlueprint'))
  }, [dispatch])

  const handleSubmit = async (bp) => {
    const result = await dispatch(createBlueprint(bp))
    if (createBlueprint.fulfilled.match(result)) {
      // Regresa al listado consultando el autor recién creado
      navigate('/', { state: { author: bp.author } })
    }
  }

  return (
    <BlueprintForm
      onSubmit={handleSubmit}
      submitting={request.status === 'loading'}
      error={request.error && `No se pudo crear el blueprint: ${request.error}`}
    />
  )
}
