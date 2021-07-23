const express = require('express');
const server = express();
const parser = require('body-parser');
const sequelize = require('sequelize');
const path = 'mysql://root@localhost:3306/delilahresto';
const myDataBase = new sequelize(path);
const jwt = require('jsonwebtoken');
server.use(parser.json());

/*para conectar la base de datos----------------------------------------------------------------------------------------------------------------*/

myDataBase.authenticate().then(() =>{ 
    console.log('BD Conectada')

}).catch(err => {
    console.error('Error de conexion' , err)
})

module.exports = myDataBase;

/*middlewares-----------------------------------------------------------------------------------------------------------------------------------*/

/*verificar token (se usa para endpoints que necesiten que el usuario haya iniciado sesión)*/

const jwtClave = "D3LiL4H_R3St0h!"

retornarUsuarioNoAutorizado = (response) =>{
    response.status(401).send({error:'Usuario no autorizado'})
}

const verificarToken = async (req, res, next) =>{
   try{
       let = token = req.headers.authorization.split(" ")[1];
       let decodeToken = jwt.verify(token,jwtClave)

       if(decodeToken){
           req.token = decodeToken;
           return next();
       }
   }catch{
       res.status(401).send({error: "Usuario no autorizado"})
   }
}

/*verificar administrador*/

const verificarAdmin = async (req, res, next) =>{
    let token = req.headers.authorization;
    console.log(token);
    if(token){
        token = token.split(" ")[1];
        let decodificado = jwt.verify(token,jwtClave)
        let admin = decodificado.is_admin
        if(admin === 0){
            retornarUsuarioNoAutorizado(res);
        }
        next();
    }else{
        retornarUsuarioNoAutorizado(res);
    }
}

/*validar información de usuario*/

function validarUsuario (req, res, next){
    const {usuario, fullname, correo, telefono, direccion, password} = req.body;

    if (!usuario || !fullname || !correo || !telefono || !direccion || !password){
        return res.status(400)
            .send({states: 'Error' , message: "Debe llenar todos los datos"})
    }

    return next();
}

/*validar si existe usuario*/

const userExist = async (req, res, next) => {
    const {correo} = req.body;

    try {
        const userExist = await myDataBase.query('SELECT * FROM usuarios WHERE correo = ?', {
            type: myDataBase.QueryTypes.SELECT,
            replacements: [correo]
        });
        if(userExist.length >= '1'){
            res.status(406).json({
                message: 'El email ya existe'
            });
        }else{
            next();
        }
    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        });  
    }
};

/*validar si existe producto*/

const productExist = async (req, res, next) => {
    const {id_producto} = req.body;

    try {
        const productExist = await myDataBase.query('SELECT * FROM productos WHERE id_producto = ?', {
            type: myDataBase.QueryTypes.SELECT,
            replacements: [id_producto]
        });
        if(productExist.length >= '1'){
            next();
            
        }else{
            res.status(404).json({
                message: 'El producto no existe'
            }); 
        }
    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        });  
    }
};

/*validar producto*/

function validarProducto (req, res, next){
    const {producto, precio} = req.body;

    if (!producto || !precio){
        return res.status(400)
            .send({states: 'Error' , message: "Faltan datos"})
    }

    return next();
}

const elPedidoExiste = async (req, res, next) =>{
    const {id} = req.params

    const pedidoExiste = await myDataBase.query('SELECT * FROM pedidos WHERE id_pedido = ?', {
        type: myDataBase.QueryTypes.SELECT,
        replacements:[id]
    })
    if (pedidoExiste.length == '0') {
        res.status(404).json({
            message: 'El pedido no existe'
        })
    } else{
        next();
    }

}

/*endpoints necesarios--------------------------------------------------------------------------------------------------------------------------*/

/*logIn*/

server.post('/login', async(req,res) => {
    const { correo, password } = req.body;
    try {
      const info = await myDataBase.query("SELECT * FROM usuarios WHERE correo=? AND password=?", {
        replacements: [correo, password],
        type: myDataBase.QueryTypes.SELECT,
      });

      if (info.length == 0) {
        res.status(401).json({"msj":"Correo o contraseña incorrectos"});
      } else {  
        const data = {
          id_usuario: info[0].id_usuario,
          usuario: info[0].usuario,
          correo: info[0].correo,
          telefono: info[0].telefono,
          direccion: info[0].direccion,
          fullname: info[0].fullname,
          is_admin: info[0].is_admin
        };
        token = jwt.sign(data, jwtClave, { expiresIn: "1h" });
        res.status(200).json({"msj":"Log in exitoso","token":token});
      }
    } catch (err) {
      console.log("error" + err);
    }
})


/*crear usuario*/

server.post('/usuarios', validarUsuario, userExist, async (req,res) =>{
    const {usuario, fullname, correo, telefono, direccion, password} = req.body
    const user = await myDataBase.query ('INSERT INTO usuarios (usuario, fullname, correo, telefono, direccion, password) VALUES (?, ?, ?, ?, ?,?)',
    {
        replacements: [usuario, fullname, correo, telefono, direccion, password ],
        type: myDataBase.QueryTypes.INSERT
    }
    )
    user.push(req.body)
    res.status(201).json({status: "Usuario creado exitosamente"});
    console.log(product)   
})

/*traer el listado de todos los usuarios con información*/

server.get('/usuarios', verificarAdmin, async (req, res) => {
    try {
        const results = await myDataBase.query('SELECT * FROM usuarios', { type: myDataBase.QueryTypes.SELECT });
        if(results){
            res.status(200).json(results);
        }else{
            throw new Error;
        }
    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        })
    }
});

/*traer información de usuarios por ID*/

server.get('/usuarios/:id', verificarAdmin, async (req, res) => {
    const {id} = req.params;
    try {
        const result = await myDataBase.query('SELECT * FROM usuarios WHERE id_usuario = ?', {
            type: myDataBase.QueryTypes.SELECT,
            replacements: [id]
        });
        if(result.length == '0'){
            res.status(404).json({
                message: 'El usuario no existe'
            })
        }else if(result.length >= '1'){
            res.status(200).json(result)
        }else{
            throw new Error
        }
    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        });
    }
});

/*traer listado de todos los productos*/

server.get('/productos', async (req, res) => {
    try {
        const results = await myDataBase.query('SELECT * FROM productos', { type: myDataBase.QueryTypes.SELECT });
        if(results){
            res.status(200).json(results);
        }else{
            throw new Error;
        }
    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        })
    }
});

/*traer producto por ID*/

server.get('/productos/:id', async (req, res) => {
    const {id} = req.params;
    try {
        const result = await myDataBase.query('SELECT * FROM productos WHERE id_producto = ?', {
            type: myDataBase.QueryTypes.SELECT,
            replacements: [id]
        });
        if(result.length == '0'){
            res.status(404).json({
                message: 'El producto no existe'
            })
        }else if(result.length >= '1'){
            res.status(200).json(result)
        }else{
            throw new Error
        }
    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        });
    }
});

/*crear un producto*/

server.post('/productos', validarProducto, verificarAdmin, async (req,res) =>{
    const {producto , precio} = req.body;
    const product = await myDataBase.query ('INSERT INTO productos (producto, precio) VALUES (?, ?)',
    {
        replacements: [producto, precio],
        type: myDataBase.QueryTypes.INSERT
    }
    )

    product.push(req.body)
    res.status(201).json({status: "Producto creado exitosamente"});
    console.log(product)
    
})

/*borrar un producto*/

server.delete('/productos/:id', verificarAdmin, productExist, async (req,res) => {
    const {id} = req.params;
    try {
        const productoEliminar = await myDataBase.query('DELETE FROM productos WHERE id_producto = ?', 
        {replacements: [id]});

        if(productoEliminar){
            res.status(200).json({
                message: 'Producto eliminado'
            });
        }else{
            throw new Error;
        };

    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        });
    };

})

/*actualizar un producto*/

server.put('/productos/:id', verificarAdmin, productExist, async (req,res) => {
    const {id} = req.params;
    const {producto, precio} = req.body;
    try {
        const actualizar = await myDataBase.query('UPDATE productos SET producto = ?, precio = ? WHERE id_producto = ?', 
        {replacements: [producto, precio, id]});

        if(actualizar){
            res.status(200).json({
                message: 'Producto actualizado'
            });
            actualizar.push(req.body);
        }else{
            throw new Error;
        };

    } catch (err) {
        res.status(400).json({
            message: `Error: ${err}`
        });
    };

})

/*crear orden-----------------------------------------------------------------------------------------------------------------------------------*/

server.post('/pedidos', verificarToken, async (req, res) => {
    
    const {id_pago, items} = req.body;
    const infoUser = req.token.id_usuario
   
    try {

    const pedido =  await myDataBase.query('INSERT INTO pedidos (id_usuario, id_pago) VALUES (?, ?)',
        {
            replacements: [infoUser, id_pago],
            type: myDataBase.QueryTypes.INSERT,
        })
        
    const order_Id = pedido[0]

    items.forEach((items) => {
        myDataBase.query('INSERT INTO pedido_producto (id_pedido,id_producto,cantidad) VALUES (?,?,?)', {
          replacements: [order_Id, items.id_producto, items.cantidad],
          type: myDataBase.QueryTypes.INSERT,
        });
      });


    const unit_price = await myDataBase.query('SELECT pedido_producto.id_producto, pedido_producto.cantidad, productos.precio, SUM(precio*cantidad) as total FROM pedido_producto JOIN productos ON pedido_producto.id_producto = productos.id_producto WHERE pedido_producto.id_pedido = :order_Id', {
        type: myDataBase.QueryTypes.SELECT,
        replacements: {order_Id: order_Id}
    })
    
    const total = await myDataBase.query('UPDATE pedidos SET total = ? where id_pedido = ?', {
        replacements: [
            unit_price[0].total,
            order_Id,
        ]
    })
    
    res.status(201).json({status:"Orden creada exitosamente"});
    } catch {
        res.status (400).json({
            message: 'Error'
        })
    }
    
})

/*borrar orden----------------------------------------------------------------------------------------------------------------------------------*/

server.delete('/pedidos/:id', verificarAdmin, elPedidoExiste,async(req, res) =>{ 
    const {id} = req.params

    try{
        const borrarPedidoProducto = await myDataBase.query('DELETE FROM pedido_producto WHERE pedido_producto.id_pedido = ?',{
            replacements: [id]
        })
        const borrarPedido = await myDataBase.query('DELETE FROM pedidos WHERE pedidos.id_pedido = ?',{
            replacements: [id]
        })

        if(borrarPedidoProducto && borrarPedido){
            res.status(200).json({
                message: 'El pedido fue eliminado con exito'
            })
        }else{
            throw new Error;
        };

    } catch(err){
        res.status(400).json({
            message: 'El pedido no existe'
        })

    }

})

/*actualizar estado del pedido------------------------------------------------------------------------------------------------------------------*/

server.put('/pedidos/:id', verificarAdmin, elPedidoExiste, async(req, res) =>{ 
    const id = req.params.id
    const {id_estado} = req.body

   const actualizarEstadoPedido = await myDataBase.query('UPDATE pedidos SET id_estado = ? WHERE pedidos.id_pedido = ?',{
    replacements:[id_estado, id],
    type: myDataBase.query.UPDATE,
   }
   )
   actualizarEstadoPedido.push(req.body)
   res.status(201).json({status: 'El estado del pedido ha sido actualizado con exito'})

})

/*traer listado de todos pedidos----------------------------------------------------------------------------------------------------------------------*/

server.get('/pedidos', verificarAdmin, async(req, res) =>{
    try {
        
        const informacionPedido = await myDataBase.query('SELECT estado_pedido.estado, pedidos.fecha, pedidos.id_pedido, pedido_producto.cantidad, productos.producto, pedidos.total, metodo_pago.pago_nombre, usuarios.fullname, usuarios.correo, usuarios.direccion, usuarios.telefono, pedido_producto.id_pedido FROM pedidos INNER JOIN usuarios ON pedidos.id_usuario = usuarios.id_usuario INNER JOIN estado_pedido ON pedidos.id_estado = estado_pedido.id_estado INNER JOIN metodo_pago ON pedidos.id_pago = metodo_pago.id_pago INNER JOIN pedido_producto ON pedidos.id_pedido = pedido_producto.id_pedido INNER JOIN productos ON pedido_producto.id_producto = productos.id_producto', {
            type: myDataBase.QueryTypes.SELECT
            
        });
        const detalleOrden= await myDataBase.query(
            "SELECT pedido_producto.id_pedido, pedido_producto.cantidad, productos.precio, productos.producto FROM pedido_producto INNER JOIN productos ON pedido_producto.id_producto = productos.id_producto",
            {
              
              type: myDataBase.QueryTypes.SELECT,
            }
          );
          pedidosFinal = {
              pedido: informacionPedido,
              pedidoDetalles: detalleOrden,
          }
        if(pedidosFinal) {
            res.status(200).json({
                pedidosFinal
            })
        } else {
            res.status(404).json({
                message: 'El pedido no existe'
            })
        }
    } catch (err) {
        res.status(400).json ({
                message:`Error`
        });
    }  

})

/*traer pedidos por ID-------------------------------------------------------------------------------------------------------------------------*/

server.get('/pedidos/:id', verificarAdmin, elPedidoExiste, async(req, res) =>{
    const {id} = req.params
    try {
        
        const informacionPedido = await myDataBase.query('SELECT estado_pedido.estado, pedidos.fecha, pedidos.id_pedido, pedido_producto.cantidad, productos.producto, pedidos.total, metodo_pago.pago_nombre, usuarios.fullname, usuarios.correo, usuarios.direccion, usuarios.telefono, pedido_producto.id_pedido FROM pedidos INNER JOIN usuarios ON pedidos.id_usuario = usuarios.id_usuario INNER JOIN estado_pedido ON pedidos.id_estado = estado_pedido.id_estado INNER JOIN metodo_pago ON pedidos.id_pago = metodo_pago.id_pago INNER JOIN pedido_producto ON pedidos.id_pedido = pedido_producto.id_pedido INNER JOIN productos ON pedido_producto.id_producto = productos.id_producto WHERE pedidos.id_pedido = ?', {
            type: myDataBase.QueryTypes.SELECT,
            replacements: [id]
        });
        const detalleOrden= await myDataBase.query(
            "SELECT pedido_producto.id_pedido, pedido_producto.cantidad, productos.precio, productos.producto FROM pedido_producto INNER JOIN productos ON pedido_producto.id_producto = productos.id_producto WHERE pedido_producto.id_pedido=?",
            {
                replacements: [id],
              type: myDataBase.QueryTypes.SELECT
            }
          );
          pedidosFinal = {
              pedido: informacionPedido,
              pedidoDetalles: detalleOrden,
          }
        if(pedidosFinal) {
            res.status(200).json({
                pedidosFinal
            })
        } else {
            res.status(404).json({
                message: 'El pedido no existe'
            })
        }
    } catch (err) {
        res.status(400).json ({
                message:`Error`
        });
    }  

})

/*conectar el servidor--------------------------------------------------------------------------------------------------------------------------*/

server.listen(3100, () =>{
    console.log('servidor iniciando...');
});